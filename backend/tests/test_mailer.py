"""SMTP postcard mail, without a live mail server."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import mailer


class MailerTests(unittest.TestCase):
    def setUp(self) -> None:
        self._env = mock.patch.dict(os.environ, {}, clear=False)
        self._env.start()
        for key in ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "SMTP_STARTTLS"):
            os.environ.pop(key, None)

    def tearDown(self) -> None:
        self._env.stop()

    def test_missing_settings_name_the_env_file(self) -> None:
        with self.assertRaises(mailer.MailError) as caught:
            mailer.send_postcard_email("alex@example.com", "https://post.test/p/abc")
        self.assertEqual(caught.exception.status, 503)
        self.assertIn("backend/.env", str(caught.exception))
        self.assertIn("SMTP_HOST", str(caught.exception))
        self.assertIn("SMTP_PASSWORD", str(caught.exception))

    def test_bad_address_is_reported_before_missing_smtp(self) -> None:
        with self.assertRaises(mailer.MailError) as caught:
            mailer.send_postcard_email("not-an-email", "https://post.test/p/abc")
        self.assertEqual(caught.exception.status, 422)

    def test_rejects_a_broken_address(self) -> None:
        os.environ.update({
            "SMTP_HOST": "smtp.example.com",
            "SMTP_PORT": "587",
            "SMTP_USER": "post@example.com",
            "SMTP_PASSWORD": "secret",
            "SMTP_FROM": "post@example.com",
        })
        with self.assertRaises(mailer.MailError) as caught:
            mailer.send_postcard_email("not-an-email", "https://post.test/p/abc")
        self.assertEqual(caught.exception.status, 422)

    def test_starttls_login_sends_the_link(self) -> None:
        os.environ.update({
            "SMTP_HOST": "smtp.example.com",
            "SMTP_PORT": "587",
            "SMTP_USER": "post@example.com",
            "SMTP_PASSWORD": "app password",
            "SMTP_FROM": "post@example.com",
        })
        smtp = mock.MagicMock()
        smtp.__enter__.return_value = smtp
        with mock.patch("mailer.smtplib.SMTP", return_value=smtp) as ctor:
            sent_to = mailer.send_postcard_email(
                "alex@example.com",
                "https://post.test/p/abc",
                "Alex",
                "Sam",
            )
        ctor.assert_called_once_with("smtp.example.com", 587, timeout=20)
        smtp.login.assert_called_once_with("post@example.com", "apppassword")
        smtp.send_message.assert_called_once()
        message = smtp.send_message.call_args.args[0]
        self.assertEqual(message["To"], "alex@example.com")
        self.assertIn("https://post.test/p/abc", message.get_content())
        self.assertIn("Alex", message.get_content())
        self.assertEqual(sent_to, "alex@example.com")
        smtp.__enter__.assert_called()

    def test_gmail_auth_failure_mentions_app_password(self) -> None:
        os.environ.update({
            "SMTP_HOST": "smtp.gmail.com",
            "SMTP_PORT": "587",
            "SMTP_USER": "you@gmail.com",
            "SMTP_PASSWORD": "nope",
            "SMTP_FROM": "you@gmail.com",
        })
        smtp = mock.MagicMock()
        smtp.__enter__.return_value = smtp
        smtp.login.side_effect = mailer.smtplib.SMTPAuthenticationError(535, b"bad")
        with mock.patch("mailer.smtplib.SMTP", return_value=smtp):
            with self.assertRaises(mailer.MailError) as caught:
                mailer.send_postcard_email("alex@example.com", "https://post.test/p/abc")
        self.assertIn("App Password", str(caught.exception))
        self.assertIn("backend/.env", str(caught.exception))


class PreviewEmailRouteTests(unittest.TestCase):
    def test_unconfigured_smtp_names_the_env_file(self) -> None:
        root = Path(__file__).resolve().parents[2]
        env = os.environ.copy()
        for key in ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "SMTP_STARTTLS"):
            env.pop(key, None)
        env["WHIMSY_PORT"] = "43221"
        data = "/tmp/whimsy-smtp-test"
        shutil.rmtree(data, ignore_errors=True)
        env["WHIMSY_DATA"] = data
        env["WHIMSY_HOST"] = "127.0.0.1"
        proc = subprocess.Popen(
            [sys.executable, str(root / "preview" / "server.py")],
            cwd=root,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        try:
            self._wait_until_up("http://127.0.0.1:43221/api/designs")
            token = self._json("POST", "http://127.0.0.1:43221/api/auth/signup", {
                "email": "sam@example.com",
                "password": "postcard1",
                "name": "Sam",
            })["token"]
            card = self._json("POST", "http://127.0.0.1:43221/api/postcards", {
                "title": "Hello",
                "front_image_url": "/designs/lighthouse.jpeg",
                "orientation": "landscape",
                "size": "standard",
                "message": "Wish you were here",
                "recipient_name": "Alex",
                "sender_name": "Sam",
                "stamp_id": "vintage_airmail",
                "seal_color": "#B83A28",
                "is_draft": False,
            }, token)
            status, body = self._request("POST", f"http://127.0.0.1:43221/api/postcards/{card['id']}/email", {
                "to": "alex@example.com",
                "link": "http://127.0.0.1:43221/p/demo",
            }, token)
            self.assertEqual(status, 503)
            self.assertIn("backend/.env", body["detail"])
            self.assertIn("SMTP_PASSWORD", body["detail"])
        finally:
            proc.terminate()
            proc.wait(timeout=5)

    def _wait_until_up(self, url: str) -> None:
        last = ""
        for _ in range(40):
            try:
                with urllib.request.urlopen(url, timeout=0.5) as response:
                    if response.status == 200:
                        return
            except Exception as exc:
                last = str(exc)
            import time
            time.sleep(0.1)
        self.fail(f"preview server did not start: {last}")

    def _json(self, method: str, url: str, payload: dict, token: str = "") -> dict:
        status, body = self._request(method, url, payload, token)
        self.assertEqual(status, 200, body)
        return body

    def _request(self, method: str, url: str, payload: dict, token: str = "") -> tuple[int, dict]:
        data = json.dumps(payload).encode()
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                return response.status, json.loads(response.read().decode())
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode()
            return exc.code, json.loads(raw) if raw else {}


if __name__ == "__main__":
    unittest.main()

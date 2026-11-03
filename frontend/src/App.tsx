import { Routes, Route } from "react-router-dom";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import { AuthBridge, RequireAuth } from "@/components/auth/AuthBridge";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import Editor from "@/pages/Editor";
import Recipient from "@/pages/Recipient";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <ClerkAuthProvider>
      <AuthBridge />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
        <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />
        <Route path="/app" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/app/new" element={<RequireAuth><Editor /></RequireAuth>} />
        <Route path="/app/edit/:id" element={<RequireAuth><Editor /></RequireAuth>} />
        <Route path="/p/:shareId" element={<Recipient />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <Toaster richColors />
    </ClerkAuthProvider>
  );
}

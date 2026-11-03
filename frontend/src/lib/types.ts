// Hand-written mirrors of backend/models/postcard.py — keep in sync.
export type Orientation = "landscape" | "portrait";
export type CardSize = "standard" | "large" | "square";

export interface PostcardIn {
  title: string;
  front_image_url: string;
  orientation: Orientation;
  size: CardSize;
  message: string;
  recipient_name: string;
  sender_name: string;
  stamp_id: string;
  seal_color: string;
  is_draft: boolean;
}

export interface OpenEvent {
  at: string;
  device: string;
}

export interface Postcard extends PostcardIn {
  id: string;
  share_id: string;
  owner_id: string;
  date_str: string;
  created_at: string;
  updated_at: string;
  opened_count: number;
  last_opened_at: string | null;
  opens: OpenEvent[];
}

export interface PublicPostcard {
  share_id: string;
  title: string;
  front_image_url: string;
  orientation: Orientation;
  size: CardSize;
  message: string;
  recipient_name: string;
  sender_name: string;
  stamp_id: string;
  seal_color: string;
  date_str: string;
}

export interface Design {
  id: string;
  title: string;
  url: string;
  orientation: Orientation;
}

export interface UploadOut {
  url: string;
}

export interface Profile {
  user_id: string;
  email: string;
  name: string;
  image_url: string;
  postcards_count: number;
  created_at: string;
}

export interface TodayOut {
  date: string;
}

/** The subset every postcard renderer needs (shared by editor, dashboard and recipient). */
export type CardFace = Pick<
  PublicPostcard,
  | "front_image_url" | "orientation" | "size" | "message" | "recipient_name"
  | "sender_name" | "stamp_id" | "seal_color" | "date_str"
>;

import type { LucideIcon } from "lucide-react";
import type { AuthUserDto } from "@creator-flow/contracts";

export type NavigationItem = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type AuthUser = AuthUserDto;

export type AuthRequest =
  | {
      email: string;
      password: string;
      remember: boolean;
      source: "login";
    }
  | {
      acceptedTerms: boolean;
      creatorDna: "start" | "skip";
      email: string;
      name: string;
      password: string;
      source: "signup";
    };

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
      password: string;
      phoneNumber: string;
      remember: boolean;
      source: "login";
    }
  | {
      acceptedTerms: boolean;
      creatorDna: "start" | "skip";
      name: string;
      password: string;
      phoneNumber: string;
      source: "signup";
    };

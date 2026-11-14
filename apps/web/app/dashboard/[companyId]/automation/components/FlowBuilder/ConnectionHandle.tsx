"use client";

import { Handle, Position, type HandleProps } from "@xyflow/react";

type ConnectionHandleVariant =
  | "default"
  | "true"
  | "false"
  | "vip"
  | "exit"
  | "button-0"
  | "button-1"
  | "button-2"
  | "button-3"
  | "button-4";

interface ConnectionHandleProps extends Omit<HandleProps, "position"> {
  position: Position;
  variant?: ConnectionHandleVariant;
}

const variantClasses: Record<ConnectionHandleVariant, string> = {
  default:
    "!w-5 !h-5 !min-w-5 !min-h-5 !rounded-full !border-2 !border-slate-300 !bg-white !shadow-sm hover:!border-slate-400 hover:!bg-slate-50",
  true: "!w-5 !h-5 !min-w-5 !min-h-5 !rounded-full !border-2 !border-emerald-400 !bg-emerald-50 hover:!border-emerald-500 hover:!bg-emerald-100",
  false:
    "!w-5 !h-5 !min-w-5 !min-h-5 !rounded-full !border-2 !border-red-400 !bg-red-50 hover:!border-red-500 hover:!bg-red-100",
  vip: "!w-5 !h-5 !min-w-5 !min-h-5 !rounded-full !border-2 !border-amber-400 !bg-amber-50 hover:!border-amber-500 hover:!bg-amber-100",
  exit: "!w-5 !h-5 !min-w-5 !min-h-5 !rounded-full !border-2 !border-rose-400 !bg-rose-50 hover:!border-rose-500 hover:!bg-rose-100",
  "button-0":
    "!w-5 !h-5 !min-w-5 !min-h-5 !rounded-full !border-2 !border-emerald-500 !bg-emerald-50 hover:!border-emerald-600 hover:!bg-emerald-100",
  "button-1":
    "!w-5 !h-5 !min-w-5 !min-h-5 !rounded-full !border-2 !border-violet-500 !bg-violet-50 hover:!border-violet-600 hover:!bg-violet-100",
  "button-2":
    "!w-5 !h-5 !min-w-5 !min-h-5 !rounded-full !border-2 !border-amber-500 !bg-amber-50 hover:!border-amber-600 hover:!bg-amber-100",
  "button-3":
    "!w-5 !h-5 !min-w-5 !min-h-5 !rounded-full !border-2 !border-sky-500 !bg-sky-50 hover:!border-sky-600 hover:!bg-sky-100",
  "button-4":
    "!w-5 !h-5 !min-w-5 !min-h-5 !rounded-full !border-2 !border-rose-500 !bg-rose-50 hover:!border-rose-600 hover:!bg-rose-100",
};

export function ConnectionHandle({
  type,
  position,
  variant = "default",
  id,
  className = "",
  ...rest
}: ConnectionHandleProps) {
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className={`${variantClasses[variant]} ${className}`}
      {...rest}
    />
  );
}

import React from "react";
import { twMerge } from "tailwind-merge";
import { MotionProps, motion } from "framer-motion";

type BlockProps = {
  className?: string;
  children?: React.ReactNode;
} & MotionProps;

export const Block = ({ className, children, ...rest }: BlockProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={twMerge(
        "col-span-1 rounded-2xl border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-blue-200/80 transition-all duration-200",
        className
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

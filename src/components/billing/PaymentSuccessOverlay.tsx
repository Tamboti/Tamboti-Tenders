import { motion, AnimatePresence } from "framer-motion";

// Shared by Billing and Pricing — both start checkout and need to celebrate
// the same way when Stripe redirects back with ?checkout=success.
export function PaymentSuccessOverlay({ open, onDismiss }: { open: boolean; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onDismiss}
          className="fixed inset-0 z-50 flex items-center h-full justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center gap-4 px-8 py-10 text-center max-w-sm"
          >
            <svg width="88" height="88" viewBox="0 0 88 88">
              <motion.circle
                cx="44"
                cy="44"
                r="35"
                fill="none"
                stroke="hsl(var(--success))"
                strokeWidth="4"
                strokeLinecap="round"
                transform="rotate(-90 44 44)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.path
                d="M28 45 L39 56 L60 32"
                fill="none"
                stroke="hsl(var(--success))"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: 0.55 }}
              />
            </svg>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.85 }}
              className="space-y-1.5"
            >
              <p className="text-lg font-semibold text-white">Payment successful</p>
              <p className="text-sm text-white/70">
                You're now on Pro - unlimited bookmarks, alerts and early visibility on every tender.
              </p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 1.05 }}
              onClick={onDismiss}
              className="mt-2 rounded-full bg-white px-5 py-2 text-sm font-medium text-black hover:bg-white/90 transition-colors"
            >
              Continue
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

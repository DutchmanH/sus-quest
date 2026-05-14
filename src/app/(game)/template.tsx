'use client'

import { motion } from 'framer-motion'

export default function GameTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{ display: 'contents' }}
    >
      {children}
    </motion.div>
  )
}

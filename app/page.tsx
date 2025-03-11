"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OrbitalBackground } from "@/components/orbital-background"

export default function LandingPage() {
  const [showPopup, setShowPopup] = useState(false)
  const [animationStep, setAnimationStep] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setAnimationStep(1), 1000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (animationStep < 4) {
      const timer = setTimeout(() => setAnimationStep((prev) => prev + 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [animationStep])

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #000000 0%, #0a150a 25%, #152815 50%, #1f3a1f 75%, #2F3A2F 100%)",
          backgroundSize: "400% 400%",
          animation: "gradientAnimation 15s ease infinite",
        }}
      />
      <style jsx>{`
        @keyframes gradientAnimation {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
      `}</style>

      {/* Add Orbital Background */}
      <OrbitalBackground />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Logo Section */}
        <header className="w-full pt-4 md:pt-8 px-4 md:px-12">
          <div className="max-w-[1400px] mx-auto">
            <div className="w-[200px] md:w-[300px]">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Forward_Global_Institute-emDMJscw6WE7xR8LftbOB61EcXg6o4.png"
                alt="Forward Global Institute"
                width={300}
                height={80}
                className="w-full h-auto"
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 relative px-4 md:px-0">
          {/* Who is FGI - Top Left */}
          <motion.div
            className="absolute top-[8%] md:top-[12%] left-[2%] md:left-[5%] max-w-[90%] md:max-w-sm"
            initial={{ opacity: 0, x: -50 }}
            animate={animationStep >= 1 ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-3 md:space-y-4">
              <h1 className="text-3xl md:text-4xl font-light text-white">Who is FGI?</h1>
              <p className="text-xs md:text-sm text-gray-200 font-light leading-relaxed">
                As part of our commitment to aiding economic and political decision-makers with data and tools to inform
                climate-resilient economic development and align financial flows - Forward Analytics hosts the Forward
                Global Institute (FGI) - a public research arm dedicated to help governments, finance ministries,
                central banks and international financial organisations navigate the net-zero transition and support
                climate finance.
              </p>
            </div>
          </motion.div>

          {/* Explanation - Bottom Right */}
          <motion.div
            className="absolute bottom-[2%] md:bottom-[2%] right-[2%] md:right-[5%] max-w-[90%] md:max-w-sm"
            initial={{ opacity: 0, x: 50 }}
            animate={animationStep >= 2 ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-black/40 border-forest/30 backdrop-blur-sm">
              <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                <h2 className="text-xl md:text-2xl font-light text-white">Our Platform</h2>
                <p className="text-xs md:text-sm text-gray-200 font-light">
                  The FGI Dashboard provides comprehensive data visualization and analysis tools for understanding
                  climate transition pathways. Our platform offers:
                </p>
                <ul className="text-xs md:text-sm list-disc list-inside text-gray-200 space-y-1.5 md:space-y-2 font-light">
                  <li>Interactive visualizations of global energy transition scenarios</li>
                  <li>Country-specific phase-out strategies for fossil fuel assets</li>
                  <li>Climate finance needs assessment tools</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Center Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={animationStep >= 4 ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5 }}
              className="mt-10 md:mt-20"
            >
              <Link href="/dashboard">
                <motion.div className="relative inline-block" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    className="bg-gradient-to-r from-black to-forest hover:from-black/90 hover:to-forest/90 text-white px-6 md:px-8 py-4 md:py-6 text-lg md:text-xl rounded-full transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden group"
                    onMouseEnter={() => setShowPopup(true)}
                    onMouseLeave={() => setShowPopup(false)}
                  >
                    <span className="relative z-10">Explore the Platform</span>
                  </Button>
                  <motion.div
                    className="absolute -inset-1 bg-gradient-to-r from-black to-forest rounded-full blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    exit={{ opacity: 0 }}
                  />
                </motion.div>
              </Link>
              <AnimatePresence>
                {showPopup && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 bg-black/80 text-white p-2 rounded shadow-lg backdrop-blur-sm border border-forest/30 text-xs md:text-sm"
                  >
                    Click to view our interactive dashboard!
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </main>

        {/* Strategic Partners */}
        <motion.footer
          className="w-full py-2 px-4 md:px-8 mt-auto"
          initial={{ opacity: 0, y: 50 }}
          animate={animationStep >= 3 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-7xl mx-auto">
            <h3 className="text-lg md:text-xl text-center mb-2 text-gray-300 font-light">Strategic Partners</h3>
            <div className="flex justify-center items-center gap-8 md:gap-16">
              {/* UNIDO Logo */}
              <motion.div
                className="relative w-32 md:w-48 h-16 md:h-24 group"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-forest/10 to-transparent rounded-lg filter blur-xl group-hover:opacity-75 transition-opacity" />
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/UNIDO-xaoW3OMw1HdVzxbLUe8OSsp1rq6eF2.png"
                  alt="UNIDO"
                  fill
                  style={{ objectFit: "contain" }}
                  className="drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                />
              </motion.div>
              {/* Imperial College Logo */}
              <motion.div
                className="relative w-32 md:w-48 h-16 md:h-24 group"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-forest/10 to-transparent rounded-lg filter blur-xl group-hover:opacity-75 transition-opacity" />
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Imperial_College_London_new_logo-uGMnN8NtfiHO2myAq5TKMye8E23BH4.png"
                  alt="Imperial College London"
                  fill
                  style={{ objectFit: "contain" }}
                  className="drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                />
              </motion.div>
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  )
}


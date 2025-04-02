"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  const [isHovered, setIsHovered] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  useEffect(() => {
    // Set the playback rate to slower speed
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative min-h-screen w-full overflow-hidden">
        {/* Video Background */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          className="absolute inset-0 w-full h-full object-cover"
          src="/FGI_background.mp4"
        />

        {/* Darker overlay gradient */}
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header/Logo */}
          <div className="w-full pt-4 md:pt-8 px-6 md:px-12">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Forward_Global_Institute-emDMJscw6WE7xR8LftbOB61EcXg6o4.png"
              alt="Forward Global Institute"
              width={300}
              height={75}
              className="h-14 w-auto"
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col justify-center px-6 md:px-16 text-white space-y-4 md:space-y-6 mt-12 md:mt-0">
            <h1 className="text-5xl md:text-7xl font-semibold">The Forward Global Institute.</h1>
            
            <p className="text-xl md:text-2xl font-semibold max-w-4xl">
              Breakthrough Climate Finance Analytics for Governments and Policy Makers.
            </p>
            
            <div className="mt-6 md:mt-10 pt-6 md:pt-10">
              <p className="text-sm md:text-base font-light max-w-3xl mb-6 md:mb-10">
                The Forward Global Institute (FGI) is a public research arm of Forward 
                Analytics Group dedicated to help governments, finance ministries, central 
                banks and international financial organisations navigate the net-zero 
                transition and support climate finance. Our commitment is to aid 
                economic and political decision-makers with data and tools to inform 
                climate-resilient economic development and align financial flows.
              </p>
              
              <div className="flex justify-center">
                <Link href="/dashboard">
                  <Button 
                    className={`border border-white rounded-full px-10 py-6 text-lg md:text-xl transition-colors duration-300 ${
                      isHovered ? "bg-white text-black" : "bg-transparent text-white"
                    }`}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                  >
                    Explore the FGI Platform
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Strategic Partners Section */}
      <div className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-6 md:px-12">
          <h2 className="text-3xl md:text-4xl font-bold text-black text-center mb-16">Strategic Partners and Funders</h2>
          
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24">
            {/* Imperial Logo */}
            <div className="w-40 md:w-48">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Imperial_College_London_new_logo-uGMnN8NtfiHO2myAq5TKMye8E23BH4.png"
                alt="Imperial College London"
                width={200}
                height={80}
                className="w-full h-auto"
              />
            </div>
            
            {/* UNIDO Logo */}
            <div className="w-40 md:w-48">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/UNIDO-xaoW3OMw1HdVzxbLUe8OSsp1rq6eF2.png"
                alt="UNIDO"
                width={200}
                height={80}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-white py-6">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <p className="text-gray-700">Forward Global Institute</p>
          <Link href="https://www.linkedin.com/company/forwardanalytics/posts/?feedView=all" target="_blank" rel="noopener noreferrer">
            <svg className="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
          </Link>
        </div>
      </footer>
    </div>
  )
}


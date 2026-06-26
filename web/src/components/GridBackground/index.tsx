'use client'

import { Box, useTheme } from "@chakra-ui/react"

interface GridBackgroundProps {
  color?: string
  zIndex?: string | number
  backgroundColor?: string
  position?: "absolute" | "fixed" | "relative" | "static" | "sticky"
  hasGradient?: boolean
}

export default function GridBackground({
  color = "rgba(229, 211, 195, 0.35)",
  zIndex = -2,
  backgroundColor = "white",
  position = "fixed",
  hasGradient = true,
}: GridBackgroundProps) {
  const theme = useTheme()

  const bgColor = backgroundColor.startsWith("#")
    ? backgroundColor
    : (theme.colors[backgroundColor] as string) ?? backgroundColor

  const gridUnit = 80

  const bgPosition = {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex,
  }

  return (
    <Box {...bgPosition} position={position} backgroundColor={bgColor} w="100%" h="100vh">
      <Box
        position={position}
        top={0}
        left={0}
        right={0}
        zIndex={-1}
        w="100%"
        h="100vh"
        background={
          hasGradient
            ? `linear-gradient(to bottom, transparent 40%, ${bgColor} 100%)`
            : "none"
        }
      />
      <Box
        {...bgPosition}
        position="absolute"
        backgroundImage={`repeating-linear-gradient(to bottom, ${color} 0px, ${color} 2px, transparent 2px, transparent ${gridUnit}px)`}
        backgroundSize={`${gridUnit}px ${gridUnit}px`}
        backgroundRepeat="repeat"
      />
      <Box
        {...bgPosition}
        position="absolute"
        backgroundImage={`repeating-linear-gradient(to right, ${color} 0px, ${color} 2px, transparent 2px, transparent ${gridUnit}px)`}
        backgroundSize={`${gridUnit}px ${gridUnit}px`}
        backgroundRepeat="repeat"
      />
    </Box>
  )
}

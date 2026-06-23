import Image from "next/image"

interface OneSourceLogoProps {
  width?: number
  height?: number
}

export default function OneSourceLogo({ width = 327, height = 48 }: OneSourceLogoProps) {
  return (
    <Image
      src="/onesource-logo.svg"
      alt="OneSource"
      width={width}
      height={height}
      style={{ width: "100%", height: "auto" }}
      priority
    />
  )
}

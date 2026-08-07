import { VStack } from "@chakra-ui/react"
import GridBackground from "../../GridBackground"
import OneSourceLogo from "../../OneSourceLogo"

export default function TemplateCover() {
  return (
    <VStack
      w={{ base: "100vw", md: "50vw" }}
      h={{ base: "50vh", md: "100vh" }}
      gap={8}
      justifyContent="center"
      alignItems="center"
    >
      <GridBackground
        color="rgba(229, 211, 195, 0.35)"
        zIndex={-2}
        backgroundColor="#F9F5F1"
        position="fixed"
        hasGradient={false}
      />
      <VStack w="100%" maxW="327px" gap={8} justifyContent="center" alignItems="center">
        <OneSourceLogo />
      </VStack>
    </VStack>
  )
}

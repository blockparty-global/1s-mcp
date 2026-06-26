import React from "react"
import { Container, Flex, Stack } from "@chakra-ui/react"
import TemplateCover from "./Template/TemplateCover"

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <Container maxW="100vw" flexDirection="column" display="flex" justifyContent="center" alignItems="center">
      <Stack
        minH="100vh"
        minW="100vw"
        flexDirection={{ base: "column", md: "row" }}
        alignItems="center"
        alignContent="center"
        justifyContent="center"
        position="relative"
      >
        <TemplateCover />
        <Flex
          w={{ base: "100vw", md: "50vw" }}
          h={{ base: "50vh", md: "100vh" }}
          position="relative"
          top={{ base: "50%", md: 0 }}
          mt={0}
          py={10}
          px={8}
          gap={6}
          justifyContent="center"
          alignItems="stretch"
          alignContent="center"
          textAlign="center"
          bg="white"
        >
          {children}
        </Flex>
      </Stack>
    </Container>
  )
}

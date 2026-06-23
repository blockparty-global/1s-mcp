import React from "react"
import { VStack, Text } from "@chakra-ui/react"

interface AuthFormTemplateProps {
  heading: string
  subHeading: string
  children: React.ReactNode
  error?: boolean
}

export default function AuthFormTemplate({
  heading,
  subHeading,
  children,
  error,
}: AuthFormTemplateProps) {
  return (
    <VStack
      maxW="400px"
      w="100%"
      alignItems="start"
      alignContent="center"
      justifyContent="center"
      textAlign="left"
      gap={4}
      mb={7}
    >
      <Text
        textStyle="title4Medium"
        color={error ? "persimmon" : "darkBrown"}
        sx={{ textWrap: "balance" } as object}
      >
        {heading}
      </Text>
      <Text
        textStyle="bodyXsMedium"
        color={error ? "persimmon" : "darkBrown"}
        sx={{ textWrap: "balance" } as object}
        mb={error ? 4 : 2}
      >
        {subHeading}
      </Text>
      {children}
    </VStack>
  )
}

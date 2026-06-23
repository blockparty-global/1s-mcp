'use client'

import { useState, useEffect, useRef } from "react"
import {
  VStack,
  FormControl,
  Input,
  Button,
  Text,
  Link,
} from "@chakra-ui/react"
import AuthLayout from "../../../src/components/Authentication/AuthLayout"
import AuthFormTemplate from "../../../src/components/Authentication/Template"
import type { ConnectSubmitResponse } from "../../../src/types/connect-api"

const RETURN_URL = process.env.NEXT_PUBLIC_OAUTH_CLIENT_RETURN_URL ?? "https://claude.ai"
const DASHBOARD_RETURN_URL = `https://app.onesource.io/dashboard/api-keys?return_url=${encodeURIComponent(RETURN_URL)}`

const ALLOWED_REDIRECT_HOSTS = ["claude.ai", "www.claude.ai"]

type PageState =
  | { kind: "loading" }
  | { kind: "ready"; state: string }
  | { kind: "init_error"; message: string }
  | { kind: "done" }

export default function ConnectPage() {
  const [page, setPage] = useState<PageState>({ kind: "loading" })
  const [apiKey, setApiKey] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const initCalled = useRef(false)

  useEffect(() => {
    if (initCalled.current) return
    initCalled.current = true

    const params = new URLSearchParams(window.location.search)
    const stateParam = params.get("state") ?? ""

    if (!stateParam) {
      setPage({ kind: "init_error", message: "Invalid link. Please return to Claude.ai and connect again." })
      return
    }

    fetch(`/api/oauth/connect-init?state=${encodeURIComponent(stateParam)}`)
      .then((res) => {
        if (!res.ok) {
          setPage({ kind: "init_error", message: "Session verification failed. Please return to Claude.ai and connect again." })
        } else {
          setPage({ kind: "ready", state: stateParam })
        }
      })
      .catch(() => {
        setPage({ kind: "init_error", message: "Could not reach the server. Please try again." })
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (page.kind !== "ready" || !apiKey || isSubmitting) return

    setIsSubmitting(true)
    setFieldError(null)

    try {
      const res = await fetch("/api/oauth/connect-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: page.state, apiKey }),
      })

      const data = await res.json() as ConnectSubmitResponse

      if (!res.ok || "error" in data) {
        const err = "error" in data ? data.error : undefined
        const msg =
          err === "invalid_key"
            ? "Invalid API key. Please check your key and try again."
            : err === "session_expired"
            ? "Session expired. Please return to Claude.ai and connect again."
            : err === "server_busy"
            ? "Server is busy. Please try again in a moment."
            : "Something went wrong. Please try again."
        setFieldError(msg)
        setIsSubmitting(false)
        return
      }

      // C-04: handle missing location field
      if (!data.location) {
        setFieldError("Something went wrong. Please try again.")
        setIsSubmitting(false)
        return
      }

      // SEC-003: validate redirect target before navigating
      try {
        const target = new URL(data.location)
        if (!ALLOWED_REDIRECT_HOSTS.includes(target.hostname)) throw new Error()
      } catch {
        setFieldError("Something went wrong. Please try again.")
        setIsSubmitting(false)
        return
      }

      setPage({ kind: "done" })
      window.location.href = data.location
    } catch {
      setFieldError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (page.kind === "loading") {
    return (
      <AuthLayout>
        <AuthFormTemplate heading="Connecting…" subHeading="Setting up your session.">
          {null}
        </AuthFormTemplate>
      </AuthLayout>
    )
  }

  if (page.kind === "init_error") {
    return (
      <AuthLayout>
        <AuthFormTemplate heading="Invalid Link" subHeading={page.message} error>
          {null}
        </AuthFormTemplate>
      </AuthLayout>
    )
  }

  if (page.kind === "done") {
    return (
      <AuthLayout>
        <AuthFormTemplate heading="Connected" subHeading="Returning to Claude.ai…">
          {null}
        </AuthFormTemplate>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthFormTemplate
        heading="Connect to Claude.ai"
        subHeading="Enter your OneSource API key to authorize access."
      >
        <VStack
          as="form"
          onSubmit={handleSubmit}
          gap={3}
          w="full"
          alignItems="start"
        >
          <FormControl isInvalid={!!fieldError}>
            <Input
              type="text"
              variant="authForm"
              placeholder="os_live_…"
              value={apiKey}
              onChange={(e) => {
                setFieldError(null)
                setApiKey(e.target.value)
              }}
              autoComplete="off"
              spellCheck={false}
              width="full"
              required
            />
            {fieldError && (
              <Text textStyle="bodyXsMedium" color="persimmon" mt={2}>
                {fieldError}
              </Text>
            )}
          </FormControl>

          <Button
            type="submit"
            variant="solid"
            w="full"
            isDisabled={!apiKey || isSubmitting}
            isLoading={isSubmitting}
            loadingText="Connecting…"
          >
            Connect
          </Button>

          <Text textStyle="bodyXsMedium" color="darkBrown.30">
            Don&apos;t have a key?{" "}
            <Link href={DASHBOARD_RETURN_URL} color="nightGreen" isExternal>
              Get one at app.onesource.io
            </Link>
          </Text>
        </VStack>
      </AuthFormTemplate>
    </AuthLayout>
  )
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get the session to extract auth token (optional for dev mode)
    const { data: { session } } = await supabase.auth.getSession()
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    
    // Add auth token if available
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`
    }

    console.log("[Smart Insights] Calling backend:", `${BACKEND_URL}/holidays/${id}/smart-insights`)
    
    let response: Response
    try {
      // Call backend API with optional auth token
      response = await fetch(`${BACKEND_URL}/holidays/${id}/smart-insights`, {
        method: "GET",
        headers,
      })
    } catch (fetchError) {
      console.error("[Smart Insights] Fetch error:", fetchError)
      return NextResponse.json(
        { 
          error: `Failed to connect to backend server at ${BACKEND_URL}. Please ensure the backend is running.`,
          details: fetchError instanceof Error ? fetchError.message : "Unknown fetch error"
        },
        { status: 503 }
      )
    }

    if (!response.ok) {
      let errorText = ""
      let errorData: any = {}
      
      try {
        errorText = await response.text()
        if (errorText) {
          try {
            errorData = JSON.parse(errorText)
          } catch {
            // If not JSON, use the text as the error message
            errorData = { detail: errorText }
          }
        }
      } catch (parseError) {
        console.error("[Smart Insights] Error parsing error response:", parseError)
        errorData = { detail: `Backend returned ${response.status}` }
      }
      
      console.error("[Smart Insights] Backend error:", response.status, errorData)
      console.error("[Smart Insights] Full error text:", errorText)
      console.error("[Smart Insights] Response headers:", Object.fromEntries(response.headers.entries()))
      
      // If it's a 500 error, provide more helpful message
      if (response.status === 500) {
        const errorMessage = errorData.detail || errorData.error || errorData.message || 
                           "Failed to generate smart insights. This may be due to missing API keys or service errors."
        console.error("[Smart Insights] 500 Error details:", {
          errorMessage,
          errorData,
          errorText,
          hasDetail: !!errorData.detail,
          hasError: !!errorData.error,
        })
        return NextResponse.json(
          { 
            error: errorMessage,
            details: errorData.detail || errorText || "Internal server error",
            status: response.status
          },
          { status: response.status }
        )
      }
      
      return NextResponse.json(
        { 
          error: errorData.detail || errorData.error || errorData.message || "Failed to fetch smart insights",
          status: response.status
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log("[Smart Insights] Success, returning data")
    return NextResponse.json(data)
  } catch (error) {
    console.error("[Smart Insights] Unexpected error:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch smart insights. Please try again.",
        type: error instanceof Error ? error.constructor.name : "Unknown"
      },
      { status: 500 }
    )
  }
}





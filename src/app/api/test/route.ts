import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test 1: Check if we can connect to Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Test 2: Check if tables exist
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('count')
      .limit(1)
    
    // Test 3: Check if audit_logs table exists (from migration 002)
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('count')
      .limit(1)
    
    return NextResponse.json({
      status: 'success',
      connection: 'OK',
      auth: authError ? 'Not authenticated' : 'Authenticated',
      tables: {
        items: itemsError ? `Error: ${itemsError.message}` : 'OK',
        audit_logs: auditError ? `Error: ${auditError.message}` : 'OK (Migration 002 applied)',
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const serviceClient = await createServiceClient()
    
    const results: Record<string, unknown> = {}
    
    // Test 1: Check auth user
    const { data: { user } } = await supabase.auth.getUser()
    results.authenticated_user = user ? { email: user.email, id: user.id } : null
    
    // Test 2: Get items via regular client (simulates what ItemSearch does)
    const { data: regularItems, error: regularError } = await supabase
      .from('items')
      .select('id, name, selling_price, stock')
      .gt('stock', 0)
      .order('name')
      .limit(50)
    
    results.via_regular_client = {
      count: regularItems?.length ?? 0,
      error: regularError?.message ?? null,
      sample: regularItems?.slice(0, 3) ?? []
    }
    
    // Test 3: Get items via service client (bypasses RLS)
    const { data: serviceItems, error: serviceError } = await serviceClient
      .from('items')
      .select('id, name, selling_price, stock')
      .gt('stock', 0)
      .order('name')
      .limit(50)
    
    results.via_service_client = {
      count: serviceItems?.length ?? 0,
      error: serviceError?.message ?? null,
      sample: serviceItems?.slice(0, 3) ?? []
    }
    
    // Test 4: Get ALL items (including stock = 0) via service client
    const { data: allItems, error: allError } = await serviceClient
      .from('items')
      .select('*')
      .order('name')
    
    results.all_items_total = allItems?.length ?? 0
    results.all_items_error = allError?.message ?? null
    results.all_items = allItems ?? []
    
    // Test 5: Check RLS policies
    try {
      const { data: policies } = await serviceClient
        .rpc('get_policies_for_table', { table_name: 'items' })
      results.rls_policies = policies ?? 'Function not found'
    } catch {
      results.rls_policies = 'Use SQL to check: SELECT * FROM pg_policies WHERE tablename = \'items\';'
    }
    
    // Test 6: Check items with problematic data
    const problematicItems = allItems?.filter(item => 
      !item.name || 
      item.stock === null || 
      item.selling_price === null ||
      item.stock < 0
    )
    
    results.problematic_items_count = problematicItems?.length ?? 0
    results.problematic_items = problematicItems?.slice(0, 5) ?? []
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      ...results
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 })
  }
}
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Auth helpers ──────────────────────────────────────────
export async function signUpWithEmail(email, password, fullName, role) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error
  if (data.user) {
    await supabase.from('profiles').upsert({ id: data.user.id, email, full_name: fullName, role })
  }
  return data
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function signInWithPhone(phone) {
  const { error } = await supabase.auth.signInWithOtp({ phone })
  if (error) throw error
}

export async function verifyOtp(phone, token) {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data
}

export async function updateProfile(userId, updates) {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw error
}

// ── Vendor helpers ────────────────────────────────────────
export async function createVendor(userId, storeName, location, whatsapp) {
  const { data, error } = await supabase
    .from('vendors')
    .insert({ user_id: userId, store_name: storeName, location, whatsapp_number: whatsapp })
    .select()
    .single()
  if (error) throw error
  await supabase.from('profiles').update({ role: 'vendor' }).eq('id', userId)
  return data
}

export async function getVendorByUser(userId) {
  const { data } = await supabase.from('vendors').select('*').eq('user_id', userId).single()
  return data
}

export async function getVendorById(vendorId) {
  const { data } = await supabase
    .from('vendors')
    .select('*, profiles(*)')
    .eq('id', vendorId)
    .single()
  return data
}

export async function updateVendor(vendorId, updates) {
  const { error } = await supabase.from('vendors').update(updates).eq('id', vendorId)
  if (error) throw error
}

// Delete a vendor account and its related data (products + media), then mark profile suspended.
export async function deleteVendorAccount(vendorId) {
  // fetch vendor to get user_id
  const { data: vendor, error: vErr } = await supabase.from('vendors').select('user_id').eq('id', vendorId).single()
  if (vErr) throw vErr
  const userId = vendor?.user_id

  // fetch products for vendor
  const { data: products, error: pErr } = await supabase.from('products').select('id, media_urls').eq('vendor_id', vendorId)
  if (pErr) throw pErr

  // remove media for each product
  await Promise.all((products || []).map(async (prod) => {
    if (prod?.media_urls?.length) {
      await Promise.all(prod.media_urls.map((url) => deleteMedia(url)).filter(Boolean))
    }
  }))

  // delete products
  await supabase.from('products').delete().eq('vendor_id', vendorId)

  // delete vendor row
  await supabase.from('vendors').delete().eq('id', vendorId)

  // mark profile as suspended so it can't manage content
  if (userId) {
    await supabase.from('profiles').update({ role: 'suspended' }).eq('id', userId)
  }
}

// ── Product helpers ───────────────────────────────────────
export async function getFeedProducts(tab = 'foryou', userId = null) {
  let query = supabase
    .from('products')
    .select(`*, vendors(id, store_name, location, whatsapp_number, is_verified, user_id)`)
    .order('is_boosted', { ascending: false })
    .order('created_at', { ascending: false })

  if (tab === 'following' && userId) {
    const { data: follows } = await supabase
      .from('follows')
      .select('vendor_id')
      .eq('follower_id', userId)
    const vendorIds = follows?.map((f) => f.vendor_id) || []
    if (vendorIds.length === 0) return []
    query = query.in('vendor_id', vendorIds)
  }

  const { data } = await query
  return data || []
}

export async function getVendorProducts(vendorId) {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function createProduct(vendorId, product) {
  const { data, error } = await supabase
    .from('products')
    .insert({ vendor_id: vendorId, ...product })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProduct(productId, updates) {
  const { error } = await supabase.from('products').update(updates).eq('id', productId)
  if (error) throw error
}

export async function deleteProduct(productId) {
  const { data: product, error: fetchError } = await supabase.from('products').select('media_urls').eq('id', productId).single()
  if (fetchError) throw fetchError
  if (product?.media_urls?.length) {
    await Promise.all(product.media_urls.map((url) => deleteMedia(url)).filter(Boolean))
  }
  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) throw error
}

export async function incrementView(productId) {
  await supabase.rpc('increment_views', { product_id: productId }).catch(() => {
    supabase.from('products').select('views').eq('id', productId).single().then(({ data }) => {
      if (data) supabase.from('products').update({ views: (data.views || 0) + 1 }).eq('id', productId)
    })
  })
}

// ── Likes ─────────────────────────────────────────────────
export async function getLikeCount(productId) {
  const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('product_id', productId)
  return count || 0
}

export async function getUserLike(userId, productId) {
  const { data } = await supabase.from('likes').select('*').eq('user_id', userId).eq('product_id', productId).single()
  return !!data
}

export async function toggleLike(userId, productId, isLiked) {
  if (isLiked) {
    await supabase.from('likes').delete().eq('user_id', userId).eq('product_id', productId)
  } else {
    await supabase.from('likes').insert({ user_id: userId, product_id: productId })
  }
}

// ── Comments ──────────────────────────────────────────────
export async function getComments(productId) {
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true })
  return data || []
}

export async function addComment(userId, productId, content, authorName) {
  const { error } = await supabase
    .from('comments')
    .insert({ user_id: userId, product_id: productId, content, author_name: authorName || 'User' })
  if (error) throw error
}

export async function deleteComment(commentId) {
  await supabase.from('comments').delete().eq('id', commentId)
}

export async function getVendorProductCount(vendorId) {
  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId)
  return count || 0
}

// ── Follows ───────────────────────────────────────────────
export async function getFollowCount(vendorId) {
  const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId)
  return count || 0
}

export async function isFollowing(userId, vendorId) {
  const { data } = await supabase.from('follows').select('*').eq('follower_id', userId).eq('vendor_id', vendorId).single()
  return !!data
}

export async function toggleFollow(userId, vendorId, following) {
  if (following) {
    await supabase.from('follows').delete().eq('follower_id', userId).eq('vendor_id', vendorId)
  } else {
    await supabase.from('follows').insert({ follower_id: userId, vendor_id: vendorId })
  }
}

// ── Media upload ──────────────────────────────────────────
export async function uploadMedia(file, vendorId) {
  const ext = file.name.split('.').pop()
  const fileName = `${vendorId}/${Date.now()}.${ext}`
  const { data, error } = await supabase.storage.from('product-media').upload(fileName, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('product-media').getPublicUrl(data.path)
  return urlData.publicUrl
}

export async function deleteMedia(url) {
  const path = url.split('/product-media/')[1]
  if (path) await supabase.storage.from('product-media').remove([path])
}

// ── Search ────────────────────────────────────────────────
export async function searchAll(query) {
  const [{ data: vendors }, { data: products }] = await Promise.all([
    supabase.from('vendors').select('*').ilike('store_name', `%${query}%`).limit(10),
    supabase.from('products').select('*, vendors(store_name)').ilike('title', `%${query}%`).limit(10),
  ])
  return { vendors: vendors || [], products: products || [] }
}

// ── Admin ─────────────────────────────────────────────────
// The admin account is a REAL Supabase Auth user (not a row anyone can read).
// Default identity is seeded once by hand — see README "Create the admin account".
export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@century.app'

export async function signInAdmin(password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password })
  if (error) throw new Error('Incorrect password')
  const profile = await getProfile(data.user.id)
  if (profile?.role !== 'admin') {
    await supabase.auth.signOut()
    throw new Error('This account is not an admin account')
  }
  return { user: data.user, profile }
}

export async function changeAdminPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function getAdminStats() {
  const [
    { count: users },
    { count: vendors },
    { count: products },
    { count: pendingResets },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('vendors').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('reset_requests').select('*', { count: 'exact', head: true }).eq('admin_sent', false),
  ])
  return { users: users || 0, vendors: vendors || 0, products: products || 0, pendingResets: pendingResets || 0 }
}

export async function getAllVendors() {
  const { data } = await supabase.from('vendors').select('*, profiles(email, phone)').order('created_at', { ascending: false })
  return data || []
}

export async function getAllProducts() {
  const { data } = await supabase.from('products').select('*, vendors(store_name)').order('created_at', { ascending: false })
  return data || []
}

export async function getResetRequests() {
  const { data } = await supabase.from('reset_requests').select('*').order('created_at', { ascending: false }).limit(50)
  return data || []
}

export async function markResetSent(id) {
  await supabase.from('reset_requests').update({ admin_sent: true }).eq('id', id)
}

export async function sendResetEmail(resetId) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('You must be signed in as admin to do this')
  const res = await fetch('/api/send-reset-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ resetId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to send email')
  return data
}

export async function requestPasswordReset(email) {
  const pin = Math.floor(100000 + Math.random() * 900000).toString()
  await supabase.from('reset_requests').insert({ email, pin })
  return pin
}

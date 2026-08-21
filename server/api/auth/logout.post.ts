export default defineEventHandler(async (event) => {
  deleteCookie(event, 'auth_token', { path: '/' })
  deleteCookie(event, 'cp_company', { path: '/' })
  return { ok: true }
})


export default defineEventHandler(async (event) => {
  // Ya no se crea nada de forma perezosa: la empresa nace al darse de alta.
  // Un GET que escribe rompía con roles de solo lectura y con empresas suspendidas.
  return requireCompany(event)
})

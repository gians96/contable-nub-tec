#!/usr/bin/env bash
# Verificación de aislamiento entre empresas contra la base de pruebas.
# Un fallo aquí significa fuga de datos entre empresas.
set -uo pipefail
API=http://localhost:3001
CK_A=/tmp/ck_a.txt
CK_L=/tmp/ck_l.txt
OK=0; FALLOS=0

check() { # descripción, esperado, obtenido
  if [ "$2" = "$3" ]; then echo "  ✓ $1"; OK=$((OK+1))
  else echo "  ✗ $1 — esperado [$2], obtenido [$3]"; FALLOS=$((FALLOS+1)); fi
}

j() { curl -s -b "$1" "$API$2"; }

id_de() { grep -oE '"id"[[:space:]]*:[[:space:]]*[0-9]+' | head -1 | grep -oE '[0-9]+$'; }

code() { # cookies, path, [method], [body]
  if [ -n "${4:-}" ]; then
    curl -s -o /dev/null -w '%{http_code}' -b "$1" -X "$3" -H 'Content-Type: application/json' -d "$4" "$API$2"
  else
    curl -s -o /dev/null -w '%{http_code}' -b "$1" -X "${3:-GET}" "$API$2"
  fi
}

post() { curl -s -b "$1" -c "$1" -X POST -H 'Content-Type: application/json' -d "$3" "$API$2"; }
cambiar() { post "$1" /api/session/company "{\"companyId\":$2}" > /dev/null; }
empresa_activa() { j "$1" /api/auth/me | tr -d ' \n' | grep -oE '"company":\{"id":[0-9]+' | grep -oE '[0-9]+$'; }

echo "=== Preparación ==="
rm -f "$CK_A" "$CK_L"
curl -s -c "$CK_A" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' > /dev/null
check "admin autenticado en la empresa A" "1" "$(empresa_activa "$CK_A")"

BID=$(post "$CK_A" /api/companies '{"ruc":"20999888777","razonSocial":"EMPRESA B DE PRUEBA"}' | id_de)
check "empresa B creada" "true" "$([ -n "$BID" ] && echo true || echo false)"
check "crear una empresa deja la sesión en ella" "$BID" "$(empresa_activa "$CK_A")"

VBID=$(post "$CK_A" /api/vouchers '{"fecha":"2026-03-15","tipoMovimiento":"VENTA","destinoTributario":"VENTA","importeTotal":99999,"tipoComprobante":"FACTURA","serie":"BBB1","numero":"1"}' | id_de)
PBID=$(post "$CK_A" /api/parties '{"tipoDocumento":"RUC","numeroDocumento":"20111222333","razonSocial":"PROVEEDOR DE B"}' | id_de)
echo "  datos de B: comprobante id=$VBID (S/ 99999), proveedor id=$PBID"

cambiar "$CK_A" 1
check "la sesión vuelve a la empresa A" "1" "$(empresa_activa "$CK_A")"

echo
echo "=== Lectura cruzada ==="
check "el listado de A no incluye el comprobante de B" "0" \
  "$(j "$CK_A" '/api/vouchers?limit=100' | tr -d ' \n' | grep -c "\"id\":$VBID,")"
check "GET /api/vouchers/{id de B} → 404" "404" "$(code "$CK_A" "/api/vouchers/$VBID")"
check "el directorio de proveedores de A no trae los de B" "0" "$(j "$CK_A" /api/parties | grep -c 'PROVEEDOR DE B')"

echo
echo "=== Escritura cruzada ==="
check "PUT /api/vouchers/{id de B} → 404" "404" \
  "$(code "$CK_A" "/api/vouchers/$VBID" PUT '{"fecha":"2026-03-15","tipoMovimiento":"COMPRA","destinoTributario":"GASTO_ADMIN","importeTotal":1}')"
check "DELETE /api/vouchers/{id de B} → 404" "404" "$(code "$CK_A" "/api/vouchers/$VBID" DELETE)"
check "duplicar un comprobante de B → 404" "404" \
  "$(code "$CK_A" /api/vouchers/duplicate POST "{\"id\":$VBID}")"
check "crear en A enlazando un proveedor de B → 404" "404" \
  "$(code "$CK_A" /api/vouchers POST "{\"fecha\":\"2026-03-15\",\"tipoMovimiento\":\"COMPRA\",\"destinoTributario\":\"GASTO_ADMIN\",\"importeTotal\":100,\"partyId\":$PBID}")"

echo
echo "=== El comprobante de B sigue intacto tras los intentos ==="
cambiar "$CK_A" "$BID"
DETALLE=$(j "$CK_A" "/api/vouchers/$VBID" | tr -d ' \n')
check "sigue existiendo" "1" "$(echo "$DETALLE" | grep -c "\"id\":$VBID,")"
check "conserva su importe: el PUT no lo tocó" "1" "$(echo "$DETALLE" | grep -c '"importeTotal":"99999')"
check "sigue siendo una VENTA: el PUT no lo convirtió en COMPRA" "1" "$(echo "$DETALLE" | grep -c '"tipoMovimiento":"VENTA"')"
cambiar "$CK_A" 1

echo
echo "=== Agregados: la venta de S/ 99999 de B no puede aparecer en A ==="
check "dashboard de A" "0" "$(j "$CK_A" '/api/dashboard?year=2026' | grep -c '99999')"
check "resumen mensual de A (cubre la deuda IGV recursiva)" "0" "$(j "$CK_A" '/api/monthly-summary?year=2026' | grep -c '99999')"
check "cierre anual de A (cubre el coeficiente y el aggregate)" "0" "$(j "$CK_A" '/api/annual-closure?year=2026' | grep -c '99999')"
check "exportación de A" "0" "$(curl -s -b "$CK_A" "$API/api/export?type=vouchers&format=csv" | grep -c 'BBB1')"

echo
echo "=== Rol de solo lectura ==="
post "$CK_A" /api/users '{"username":"lector_prueba","nombre":"Lector","password":"lector12345","role":"LECTOR"}' > /dev/null
curl -s -c "$CK_L" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"lector_prueba","password":"lector12345"}' > /dev/null
check "LECTOR puede leer" "200" "$(code "$CK_L" '/api/vouchers?limit=1')"
check "LECTOR no puede crear" "403" \
  "$(code "$CK_L" /api/vouchers POST '{"fecha":"2026-03-15","tipoMovimiento":"VENTA","destinoTributario":"VENTA","importeTotal":50}')"
check "LECTOR no gestiona miembros" "403" "$(code "$CK_L" /api/users)"
check "LECTOR no entra al panel de plataforma" "403" "$(code "$CK_L" /api/platform/companies)"
check "LECTOR no puede saltar a la empresa B" "403" "$(code "$CK_L" /api/session/company POST "{\"companyId\":$BID}")"

echo
echo "=== Cookie de empresa manipulada a mano ==="
# El lector solo pertenece a la empresa A. Lo que importa no es a qué empresa
# cae el respaldo, sino que nunca caiga en una que no sea suya.
JWT_L=$(grep auth_token "$CK_L" | awk '{print $NF}')
activa_con_cookie() {
  curl -s -H "Cookie: auth_token=$JWT_L; cp_company=$1" "$API/api/auth/me" \
    | tr -d ' \n' | grep -oE '"company":\{"id":[0-9]+' | grep -oE '[0-9]+$'
}
check "cookie apuntando a una empresa ajena → no le da acceso a esa" "1" "$(activa_con_cookie "$BID")"
check "cookie apuntando a una empresa inexistente → cae en la suya" "1" "$(activa_con_cookie 99999)"
check "con cookie ajena, los datos servidos siguen siendo los suyos" "0" \
  "$(curl -s -H "Cookie: auth_token=$JWT_L; cp_company=$BID" "$API/api/vouchers?limit=100" | tr -d ' \n' | grep -c "\"id\":$VBID,")"

echo
echo "=== Empresa suspendida ==="
curl -s -b "$CK_A" -X PUT -H 'Content-Type: application/json' -d '{"estado":"SUSPENDIDA"}' "$API/api/platform/companies/$BID" > /dev/null
cambiar "$CK_A" "$BID"
check "suspendida: se puede leer" "200" "$(code "$CK_A" '/api/vouchers?limit=1')"
check "suspendida: se puede exportar la contabilidad" "200" "$(code "$CK_A" '/api/export?type=vouchers&format=csv')"
check "suspendida: no se puede escribir" "403" \
  "$(code "$CK_A" /api/vouchers POST '{"fecha":"2026-03-15","tipoMovimiento":"VENTA","destinoTributario":"VENTA","importeTotal":50}')"
cambiar "$CK_A" 1

echo
echo "════════════════════════════════════"
echo "  ✓ $OK correctas   ✗ $FALLOS fallos"
echo "════════════════════════════════════"
[ "$FALLOS" -eq 0 ]

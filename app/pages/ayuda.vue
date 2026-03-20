<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-800 mb-1">Ayuda Tributaria</h1>
    <p class="text-gray-500 text-sm mb-6">Guía rápida sobre impuestos para MYPE en Perú</p>

    <div class="space-y-3">
      <AccordionItem v-for="(item, i) in articles" :key="i" :title="item.title">
        <div v-html="item.content" class="prose prose-sm max-w-none text-gray-600"></div>
      </AccordionItem>
    </div>
  </div>
</template>

<script setup lang="ts">
// Accordion inline component
const AccordionItem = defineComponent({
  props: { title: String },
  setup(props, { slots }) {
    const open = ref(false)
    return () =>
      h('div', { class: 'card overflow-hidden' }, [
        h('button', {
          class: 'w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors',
          onClick: () => { open.value = !open.value },
        }, [
          h('span', { class: 'font-semibold text-gray-800' }, props.title),
          h('svg', {
            class: ['w-5 h-5 text-gray-400 transition-transform', open.value ? 'rotate-180' : ''],
            fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24',
          }, [
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M19 9l-7 7-7-7' }),
          ]),
        ]),
        open.value
          ? h('div', { class: 'px-5 pb-5 pt-0 border-t border-gray-100' }, slots.default?.())
          : null,
      ])
  },
})

const articles = [
  {
    title: '¿Qué es el Régimen MYPE Tributario (RMT)?',
    content: `
      <p>El RMT es un régimen tributario creado para las micro y pequeñas empresas con ingresos netos anuales de hasta <strong>1,700 UIT</strong>.</p>
      <p><strong>Beneficios principales:</strong></p>
      <ul>
        <li>Tasa reducida de IR: <strong>10%</strong> para las primeras 15 UIT de renta neta (en 2025: hasta S/ 80,250)</li>
        <li>Tasa del <strong>29.5%</strong> solo sobre el exceso de 15 UIT</li>
        <li>Pago a cuenta mensual de IR del <strong>1%</strong> si tus ingresos anuales no superan 300 UIT</li>
        <li>Libros contables simplificados si ingresos &lt; 300 UIT</li>
      </ul>
    `,
  },
  {
    title: '¿Cómo funciona el IGV?',
    content: `
      <p>El IGV (Impuesto General a las Ventas) es del <strong>18%</strong> (16% IGV + 2% IPM) sobre el valor de venta.</p>
      <p><strong>Mecánica:</strong></p>
      <ul>
        <li><strong>IGV de ventas (débito fiscal):</strong> Lo que cobras a tus clientes. Tú lo retienes y lo pagas a SUNAT.</li>
        <li><strong>IGV de compras (crédito fiscal):</strong> Lo que pagaste en tus compras deducibles. Lo descuentas de tu débito fiscal.</li>
        <li><strong>IGV neto = IGV ventas − IGV compras</strong></li>
        <li>Si el IGV neto es positivo → lo pagas a SUNAT</li>
        <li>Si es negativo → tienes <strong>saldo a favor</strong> que se arrastra al siguiente mes</li>
      </ul>
      <p><strong>Ejemplo:</strong> Vendes S/ 11,800 (base S/ 10,000 + IGV S/ 1,800). Compraste insumos por S/ 5,900 (base S/ 5,000 + IGV S/ 900). Tu IGV neto es S/ 1,800 − S/ 900 = <strong>S/ 900 a pagar</strong>.</p>
    `,
  },
  {
    title: '¿Cómo se calcula el IR mensual?',
    content: `
      <p>En el RMT con ingresos anuales menores a 300 UIT, el pago a cuenta mensual de IR es:</p>
      <p class="text-center text-lg font-semibold my-3">Pago a cuenta = 1% × Ingresos netos del mes</p>
      <p><strong>Ejemplo:</strong> Si en enero vendiste S/ 50,000 (sin IGV), tu pago a cuenta de IR es S/ 50,000 × 1% = <strong>S/ 500</strong>.</p>
      <p>Este pago mensual es un <strong>adelanto</strong> del IR anual. Al cierre del año, se calcula el IR real y se restan estos pagos a cuenta.</p>
    `,
  },
  {
    title: '¿Cómo se calcula el IR anual en el RMT?',
    content: `
      <p>Al cierre del ejercicio fiscal:</p>
      <ol>
        <li><strong>Calcular la renta neta:</strong> Ingresos − Costos − Gastos deducibles − Depreciación</li>
        <li><strong>Aplicar tramos RMT:</strong>
          <ul>
            <li>Hasta 15 UIT (2025: S/ 80,250): tasa del <strong>10%</strong></li>
            <li>Exceso de 15 UIT: tasa del <strong>29.5%</strong></li>
          </ul>
        </li>
        <li><strong>Descontar pagos a cuenta mensuales y retenciones</strong></li>
        <li>La diferencia es el <strong>IR por regularizar</strong> (o saldo a favor)</li>
      </ol>
      <p><strong>Ejemplo:</strong> Renta neta de S/ 120,000. IR = (80,250 × 10%) + (39,750 × 29.5%) = 8,025 + 11,726 = <strong>S/ 19,751</strong>. Si tus pagos a cuenta del año suman S/ 15,000, debes regularizar S/ 4,751.</p>
    `,
  },
  {
    title: '¿Qué es deducible y qué no para IR?',
    content: `
      <p><strong>Gastos deducibles</strong> (reducen tu base imponible de IR):</p>
      <ul>
        <li>Compras de mercadería (costo de ventas)</li>
        <li>Alquiler del local comercial</li>
        <li>Servicios de luz, agua, internet (del negocio)</li>
        <li>Sueldos y beneficios sociales</li>
        <li>Depreciación de activos fijos</li>
        <li>Servicios profesionales (contador, abogado)</li>
        <li>Publicidad y marketing</li>
      </ul>
      <p><strong>No deducibles:</strong></p>
      <ul>
        <li>Gastos personales del dueño</li>
        <li>Multas y sanciones</li>
        <li>Compras sin comprobante de pago</li>
        <li>Gastos no vinculados al giro del negocio</li>
        <li>Donaciones sin certificación</li>
      </ul>
    `,
  },
  {
    title: '¿Qué comprobantes dan crédito fiscal de IGV?',
    content: `
      <ul>
        <li><strong>Facturas:</strong> Siempre dan crédito fiscal si están relacionadas al negocio</li>
        <li><strong>Boletas de venta:</strong> <strong>No dan crédito fiscal de IGV</strong> (pero hasta cierto límite pueden ser gasto deducible para IR)</li>
        <li><strong>Recibo por honorarios:</strong> No tiene IGV, pero es gasto deducible para IR</li>
        <li><strong>Tickets (máquina registradora):</strong> Dan crédito fiscal si cumplen requisitos</li>
        <li><strong>Nota de crédito:</strong> Ajusta el crédito fiscal original</li>
      </ul>
      <p><strong>Requisito clave:</strong> Para que una compra dé crédito fiscal, debe estar sustentada con <strong>factura</strong>, estar registrada en el <strong>Registro de Compras</strong>, y ser un gasto <strong>vinculado al negocio</strong>.</p>
    `,
  },
  {
    title: '¿Cuándo se pagan los impuestos mensuales?',
    content: `
      <p>Los impuestos mensuales (IGV e IR pago a cuenta) se declaran y pagan según el <strong>cronograma de SUNAT</strong>, generalmente entre el <strong>10 y 22 del mes siguiente</strong> según tu último dígito de RUC.</p>
      <p><strong>¿Dónde se paga?</strong></p>
      <ul>
        <li><strong>SUNAT Operaciones en Línea (SOL):</strong> <code>clave-sol.sunat.gob.pe</code></li>
        <li>Se usa el <strong>PDT 621</strong> o el <strong>Formulario Virtual Simplificado 621</strong></li>
      </ul>
      <p><strong>¿Y el IR anual?</strong> Se declara con el <strong>Formulario Virtual 710</strong> entre marzo y abril del año siguiente.</p>
    `,
  },
  {
    title: '¿Qué es la depreciación y cómo funciona?',
    content: `
      <p>La depreciación es el desgaste del valor de un activo fijo a lo largo del tiempo. SUNAT permite deducir este monto como gasto.</p>
      <p><strong>Tasas máximas de depreciación anual:</strong></p>
      <ul>
        <li>Equipos de cómputo: <strong>25%</strong> (4 años)</li>
        <li>Muebles y enseres: <strong>10%</strong> (10 años)</li>
        <li>Vehículos: <strong>20%</strong> (5 años)</li>
        <li>Maquinaria: <strong>10-20%</strong> (según tipo)</li>
        <li>Edificaciones: <strong>5%</strong> (20 años)</li>
      </ul>
      <p>En esta app se usa <strong>depreciación en línea recta</strong>: valor ÷ vida útil en meses × 12 meses = depreciación anual.</p>
    `,
  },
  {
    title: '¿Cómo usar esta aplicación paso a paso?',
    content: `
      <ol>
        <li><strong>Configurar datos:</strong> Ve a Configuración y completa el RUC, razón social y parámetros tributarios del año.</li>
        <li><strong>Registrar comprobantes:</strong> Cada venta o compra que hagas, regístrala en Comprobantes con su tipo, monto y clasificación.</li>
        <li><strong>Revisar resumen mensual:</strong> Cada mes, verifica tu IGV neto e IR sugerido. Anota los pagos que realizaste a SUNAT.</li>
        <li><strong>Registrar activos fijos:</strong> Si compraste equipos duraderos, regístralos en Inventario para que la depreciación se calcule.</li>
        <li><strong>Cierre anual:</strong> Al final del año, revisa el Cierre Anual para estimar tu IR anual y las casillas del FV 710.</li>
        <li><strong>Exportar para tu contador:</strong> Usa Importar/Exportar para descargar tu data en Excel y enviarla a tu contador.</li>
      </ol>
    `,
  },
]
</script>

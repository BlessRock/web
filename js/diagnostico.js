/* =====================================================================
   AImátika · Diagnóstico digital gratis (panel lateral)
   ---------------------------------------------------------------------
   Este archivo hace TODO el panel: lo dibuja, lo abre y lo cierra, hace
   las preguntas, calcula el resultado, envía los correos (EmailJS) y
   guarda el contacto en HubSpot.

   Cómo se usa: cualquier enlace que vaya a "contacto.html#formulario"
   (o que tenga el atributo data-diagnostico) abre el panel en vez de ir
   a otra página. Si el JavaScript no carga, el enlace sigue funcionando
   normal y lleva a la página de contacto.

   En WordPress + Elementor: subir este archivo y diagnostico.css, y
   cargarlos en todas las páginas (ver GUIA-ELEMENTOR.md, sección
   "Diagnóstico").

   ÍNDICE
   1. CONFIGURACIÓN  ← aquí van las claves y el número de WhatsApp
   2. Preguntas
   3. Cálculo del resultado
   4. Textos del resultado
   5. Utilidades
   6. Dibujo del panel (HTML)
   7. Abrir y cerrar
   8. Preguntas: mostrar, guardar, avanzar
   9. Datos de la persona y envío
  10. Mostrar el resultado
  11. "Prefiero que me contacten"
  12. Envíos: EmailJS y HubSpot
  13. Correos (diseño HTML)
   ===================================================================== */
(() => {
  'use strict';

  /* =====================================================================
     1. CONFIGURACIÓN
     ===================================================================== */

  // WHATSAPP · Para cambiar el número, cámbialo SOLO aquí.
  // Formato internacional, sin +, sin espacios ni guiones (57 + número).
  const WHATSAPP = '573170402062';

  // EMAILJS · Copia estos datos desde tu cuenta en https://dashboard.emailjs.com
  // Mientras digan "PEGA_AQUI…" no se envían correos (el resultado igual se muestra).
  const EMAILJS = {
    publicKey: 'PEGA_AQUI_TU_PUBLIC_KEY',          // Account > General > Public Key
    serviceId: 'PEGA_AQUI_TU_SERVICE_ID',          // Email Services > el servicio que conectaste (ej: service_ab12cd3)
    plantillaPersona: 'PEGA_AQUI_TEMPLATE_PERSONA', // Email Templates > plantilla "Diagnóstico para la persona"
    plantillaEquipo: 'PEGA_AQUI_TEMPLATE_EQUIPO',   // Email Templates > plantilla "Aviso para AImátika"
  };

  // CORREO DEL EQUIPO · A este correo llegan los avisos con los datos y las respuestas.
  const CORREO_EQUIPO = 'contacto@aimatika.com';

  // HUBSPOT · Formulario donde quedan guardados los contactos.
  // Los nombres de la derecha deben existir como campos en ese formulario de HubSpot.
  // Si alguno no existe en tu formulario, borra esa línea.
  const HUBSPOT = {
    portalId: '52099107',
    formId: 'b0334f2f-d9f3-42cf-accf-a9d0e6f2b71f',
    campos: {
      nombre: 'firstname',
      negocio: 'company',
      correo: 'email',
      celular: 'phone',
      resumen: 'message',
    },
  };

  // PÁGINA DE PRIVACIDAD · Déjalo vacío para que se calcule solo.
  // En WordPress pon la dirección completa, ej: 'https://www.aimatika.com/privacidad/'
  const URL_PRIVACIDAD = '';

  // Librería de EmailJS (se carga sola desde internet cuando se abre el panel)
  const SDK_EMAILJS = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';

  // Tiempo máximo de espera para los envíos (en milisegundos)
  const ESPERA_MAXIMA = 12000;


  /* =====================================================================
     2. PREGUNTAS
     - type "single": se elige una. "multiple": se pueden elegir varias.
     - condition: la pregunta solo aparece si se cumple.
     - OJO: si cambias el texto de una opción, cámbialo también en el
       cálculo (sección 3), porque allá se compara palabra por palabra.
     ===================================================================== */
  const PREGUNTAS = [
    {
      id: 1, section: 'Tu negocio',
      title: '¿A qué se dedica tu negocio?',
      description: 'Elige la opción que más se parezca.',
      type: 'single',
      options: [
        'Servicios profesionales', 'Comercio o tienda', 'Industria o manufactura',
        'Tecnología o software', 'Salud', 'Educación', 'Gastronomía o alimentos',
        'Construcción o inmobiliaria', 'Belleza o bienestar', 'Otro',
      ],
    },
    {
      id: 2, section: 'Objetivos',
      title: '¿Qué es lo que más quieres lograr hoy?',
      description: 'Elige el resultado que más te importa.',
      type: 'single',
      options: [
        'Conseguir más clientes', 'Aumentar las ventas', 'Que más gente conozca mi marca',
        'Lanzar un producto o servicio nuevo', 'Mejorar mi presencia digital',
        'Organizar mi marketing', 'Automatizar procesos',
        'Tomar mejores decisiones con datos', 'Otro',
      ],
    },
    {
      id: 3, section: 'Situación actual',
      title: '¿Qué es lo que más te está frenando hoy?',
      description: 'Elige la situación que más se parece a la tuya.',
      type: 'single',
      options: [
        'No me llegan suficientes clientes',
        'Me escriben, pero pocos compran',
        'Tengo clientes, pero quiero vender más',
        'Estoy en internet, pero no veo resultados',
        'Mi marca no se ve tan profesional como quisiera',
        'No sé qué contenido publicar',
        'La publicidad no me está funcionando',
        'Hago muchas tareas a mano',
        'Se me escapan oportunidades de venta',
        'No sé qué está funcionando y qué no',
        'No tengo una estrategia digital clara',
      ],
    },
    {
      id: 4, section: 'Estrategia',
      title: '¿Qué tan claro tienes el camino para resolverlo?',
      description: 'Así entendemos si te hace falta más un plan, más manos o las dos cosas.',
      type: 'single',
      options: [
        'Tengo una estrategia definida',
        'Sé qué hacer, pero me falta apoyo para hacerlo',
        'Tengo ideas, pero no un plan',
        'He probado varias cosas sin resultados claros',
        'No sé por dónde empezar',
      ],
    },
    {
      id: 5, section: 'Presencia digital',
      title: '¿Qué canales usas hoy?',
      description: 'Puedes elegir varios.',
      type: 'multiple',
      options: [
        'Página web', 'Instagram', 'Facebook', 'TikTok', 'LinkedIn',
        'YouTube', 'Google (perfil de negocio)', 'WhatsApp Business',
        'Correos masivos', 'Ninguno',
      ],
    },
    {
      id: 6, section: 'Página web',
      title: '¿Cómo te va con tu página web?',
      description: 'Elige la que mejor describa lo que pasa hoy.',
      type: 'single',
      condition: () => tieneRespuesta(5, 'Página web'),
      options: [
        'Me trae contactos o ventas todo el tiempo',
        'Me trae algo, pero podría ser mejor',
        'Tiene visitas, pero pocos me escriben',
        'Está desactualizada',
        'No sé si funciona porque no la mido',
        'Casi no me trae resultados',
      ],
    },
    {
      id: 7, section: 'Página web',
      title: '¿Cuál se parece más a tu situación con la página web?',
      description: 'Queremos saber qué tan importante es para ti tener una.',
      type: 'single',
      condition: () => !tieneRespuesta(5, 'Página web'),
      options: [
        'Quiero crear una pronto',
        'La necesito, pero no sé qué debería tener',
        'Vendo sobre todo por redes o WhatsApp',
        'No estoy seguro de necesitarla',
        'No es prioridad ahora',
      ],
    },
    {
      id: 8, section: 'Marca',
      title: '¿Cómo ves hoy la imagen de tu marca?',
      description: 'Piensa en tu logo, colores, letras, redes y piezas para vender.',
      type: 'single',
      options: [
        'Profesional y coherente',
        'Profesional, pero podría actualizarse',
        'Se ve bien, pero no es igual en todos lados',
        'Se ve desactualizada',
        'No refleja lo que ofrezco',
        'No tengo una identidad visual definida',
      ],
    },
    {
      id: 9, section: 'Identidad de marca',
      title: '¿Qué te gustaría mejorar de tu marca?',
      description: 'Puedes elegir varias.',
      type: 'multiple',
      condition: () => [
        'Se ve desactualizada',
        'No refleja lo que ofrezco',
        'No tengo una identidad visual definida',
        'Se ve bien, pero no es igual en todos lados',
      ].includes(respuesta(8)),
      options: [
        'Logo e identidad visual', 'Colores y tipografías', 'Redes sociales',
        'Material para vender', 'Página web', 'Empaques o piezas físicas',
        'Presentación de la empresa', 'Cómo explico lo que me hace diferente',
        'Todo lo anterior',
      ],
    },
    {
      id: 10, section: 'Marketing y Contenidos',
      title: '¿Cada cuánto publicas contenido?',
      description: 'Cuenta redes, blog, videos o cualquier otro canal.',
      type: 'single',
      options: [
        'Todos los días', 'Varias veces por semana', 'Una vez por semana',
        'Algunas veces al mes', 'Cuando tengo tiempo', 'Casi nunca', 'No publico',
      ],
    },
    {
      id: 11, section: 'Marketing y Contenidos',
      title: '¿Qué tan definida está tu estrategia de contenidos?',
      description: 'Elige la que mejor describa cómo lo haces hoy.',
      type: 'single',
      options: [
        'Tengo estrategia y calendario',
        'Tengo estrategia, pero me cuesta cumplirla',
        'Publico sin una estrategia clara',
        'Publico más que todo para que las redes no se vean quietas',
        'No sé qué debería publicar',
        'No tengo contenidos',
      ],
    },
    {
      id: 12, section: 'Pauta',
      title: '¿Hoy inviertes en publicidad digital?',
      description: 'Elige la opción que más se parezca.',
      type: 'single',
      options: [
        'Sí, en Meta (Instagram y Facebook)', 'Sí, en Google', 'Sí, en Meta y en Google',
        'Sí, en otra plataforma', 'No, pero quiero empezar', 'No hago publicidad',
      ],
    },
    {
      id: 13, section: 'Pauta',
      title: '¿Cómo te parecen los resultados de tu publicidad?',
      description: 'Queremos entender qué tan bien te está funcionando.',
      type: 'single',
      condition: () => [
        'Sí, en Meta (Instagram y Facebook)', 'Sí, en Google', 'Sí, en Meta y en Google', 'Sí, en otra plataforma',
      ].includes(respuesta(12)),
      options: [
        'Me trae ventas de forma constante', 'Me trae buenos contactos',
        'Me escriben, pero pocos compran',
        'Me llegan muchos contactos que no sirven',
        'Invierto, pero no veo resultados', 'No sé cómo medirla',
      ],
    },
    {
      id: 14, section: 'Pauta',
      title: '¿Qué te ha frenado para invertir en publicidad?',
      description: 'No hay respuestas buenas ni malas. Queremos entender tu caso.',
      type: 'single',
      condition: () => ['No, pero quiero empezar', 'No hago publicidad'].includes(respuesta(12)),
      options: [
        'No sé cómo hacerlo', 'No sé cuánto invertir',
        'He tenido malas experiencias', 'No sé qué plataforma usar',
        'No tengo presupuesto para eso ahora', 'Nunca lo he intentado',
      ],
    },
    {
      id: 15, section: 'Google',
      title: 'Cuando alguien busca en Google lo que tú ofreces, ¿qué tan fácil te encuentra?',
      description: 'Si no lo sabes, también es una respuesta válida.',
      type: 'single',
      options: [
        'Salgo entre los primeros resultados', 'Salgo, pero muy abajo',
        'Salgo solo si buscan mi nombre', 'No sé', 'Casi no salgo',
        'No tengo presencia en Google',
      ],
    },
    {
      id: 16, section: 'Google',
      title: '¿Qué tan importante es para ti que los clientes te encuentren solos, sin pagar publicidad?',
      description: 'Por ejemplo, en las búsquedas de Google o en Google Maps.',
      type: 'single',
      options: [
        'Muy importante', 'Importante', 'Me interesa, pero no es prioridad',
        'No lo había pensado', 'Prefiero la publicidad',
      ],
    },
    {
      id: 17, section: 'Ventas',
      title: '¿Por dónde te llegan hoy las personas interesadas?',
      description: 'Puedes elegir varios.',
      type: 'multiple',
      options: [
        'WhatsApp', 'Instagram', 'Facebook', 'Página web', 'Google',
        'Formularios', 'Llamadas', 'Correo', 'Referidos', 'Vendedores', 'Otro',
      ],
    },
    {
      id: 18, section: 'Ventas',
      title: '¿Qué pasa después de que alguien muestra interés?',
      description: 'Piensa en lo que pasa de verdad, no en lo que debería pasar.',
      type: 'single',
      options: [
        'Tengo un proceso de venta definido',
        'Alguien lo contacta a mano',
        'Respondo más que todo por WhatsApp',
        'Hago seguimiento cuando puedo',
        'Algunos se quedan sin seguimiento',
        'No tengo un proceso definido',
        'No sé cuántos se me pierden',
      ],
    },
    {
      id: 19, section: 'Contactos',
      title: '¿Dónde guardas la información de tus clientes?',
      description: 'Elige lo que más usas.',
      type: 'single',
      options: [
        'En un CRM (un programa para organizar clientes)', 'En Excel o Google Sheets',
        'En WhatsApp', 'En el correo', 'En un sistema propio',
        'En varias herramientas que no se conectan', 'No llevo un registro organizado',
      ],
    },
    {
      id: 20, section: 'Automatización',
      title: '¿Qué tareas te gustaría dejar de hacer a mano?',
      description: 'Puedes elegir varias.',
      type: 'multiple',
      options: [
        'Conseguir contactos', 'Responder a clientes', 'Hacer seguimiento de ventas',
        'Enviar correos', 'Agendar citas', 'Publicar contenido',
        'Hacer reportes', 'Actualizar bases de datos', 'Tareas administrativas',
        'Conectar mis herramientas entre sí', 'No sé qué podría automatizar',
      ],
    },
    {
      id: 21, section: 'Inteligencia artificial',
      title: '¿Cómo usas hoy la inteligencia artificial?',
      description: 'Queremos saber en qué punto estás.',
      type: 'single',
      options: [
        'La uso todos los días', 'La uso de vez en cuando',
        'Apenas estoy empezando a probarla',
        'Sé que me puede ayudar, pero no sé cómo',
        'No la uso',
      ],
    },
    {
      id: 22, section: 'Medición',
      title: '¿Cómo sabes si tu marketing está funcionando?',
      description: 'Elige la que más se parezca a lo que haces.',
      type: 'single',
      options: [
        'Tengo indicadores y los reviso seguido',
        'Miro las estadísticas de las redes',
        'Miro sobre todo las ventas',
        'Miro los resultados de la publicidad',
        'Reviso varias herramientas, pero la información está regada',
        'No mido', 'No sé qué debería medir',
      ],
    },
    {
      id: 23, section: 'Datos',
      title: '¿Cuáles de estas frases se parecen a tu negocio?',
      description: 'Puedes elegir varias.',
      type: 'multiple',
      options: [
        'Tengo datos, pero no sé interpretarlos',
        'Uso demasiadas herramientas', 'La información está regada',
        'No tengo indicadores claros', 'No sé qué canal me trae más ventas',
        'No sé cuánto me cuesta conseguir un cliente',
        'No sé qué campañas funcionan mejor',
        'Tengo buenos datos y los uso para decidir',
        'No tengo suficiente información',
      ],
    },
    {
      id: 24, section: 'Prioridad',
      title: 'Si pudieras resolver UNA sola cosa en los próximos 3 meses, ¿cuál sería?',
      description: 'Esta respuesta pesa más en tu resultado.',
      type: 'single',
      options: [
        'Conseguir más clientes', 'Vender más', 'Mejorar mi marca',
        'Mejorar mis redes y contenidos', 'Mejorar mi publicidad',
        'Aparecer mejor en Google', 'Crear o mejorar mi página web',
        'Organizar mis contactos y clientes', 'Automatizar procesos',
        'Usar inteligencia artificial', 'Entender mejor mis datos',
        'Definir una estrategia digital',
      ],
    },
    {
      id: 25, section: 'Tu momento',
      title: '¿En qué momento estás para hacer cambios?',
      description: 'Esto nos ayuda a entender tu ritmo.',
      type: 'single',
      options: [
        'Quiero empezar ya', 'En los próximos 30 días',
        'Estoy mirando opciones', 'Probablemente en 3 a 6 meses',
        'Por ahora solo estoy explorando',
      ],
    },
  ];

  // Estado del diagnóstico (se conserva aunque cierres el panel)
  const respuestas = {};
  let indice = 0;
  let resultado = null;   // se llena al terminar
  let datosPersona = null;

  function respuesta(id) { return respuestas[id]; }
  function tieneRespuesta(id, valor) {
    const r = respuestas[id];
    return Array.isArray(r) ? r.includes(valor) : r === valor;
  }
  const preguntasActivas = () => PREGUNTAS.filter((q) => !q.condition || q.condition());
  const es = (id, lista) => lista.includes(respuesta(id));


  /* =====================================================================
     3. CÁLCULO DEL RESULTADO
     Puntaje de madurez digital (0 a 100) y prioridad de cada servicio.
     ===================================================================== */
  const ESTRATEGIA = 'Estrategia Digital';
  const IDENTIDAD = 'Identidad de marca';
  const MARKETING = 'Marketing y Contenidos';
  const PAUTA = 'Pauta y Automatización';
  const WEB = 'Páginas web';

  function calcularPuntaje() {
    let p = 50;
    if (es(2, ['Conseguir más clientes', 'Aumentar las ventas'])) p += 4;

    const camino = respuesta(4);
    if (camino === 'Tengo una estrategia definida') p += 8;
    if (camino === 'Sé qué hacer, pero me falta apoyo para hacerlo') p += 5;
    if (camino === 'No sé por dónde empezar') p -= 8;

    if (es(10, ['Todos los días', 'Varias veces por semana'])) p += 6;
    if (respuesta(11) === 'Tengo estrategia y calendario') p += 7;

    if (es(13, ['Me trae ventas de forma constante', 'Me trae buenos contactos'])) p += 5;
    if (es(13, ['Invierto, pero no veo resultados', 'No sé cómo medirla'])) p -= 5;

    if (respuesta(15) === 'Salgo entre los primeros resultados') p += 6;

    if (respuesta(18) === 'Tengo un proceso de venta definido') p += 7;
    if (respuesta(19) === 'En un CRM (un programa para organizar clientes)') p += 5;

    if (respuesta(22) === 'Tengo indicadores y los reviso seguido') p += 6;
    if (respuesta(21) === 'La uso todos los días') p += 4;

    return Math.max(0, Math.min(100, p));
  }

  // Equivalencias con el diagnóstico original:
  // Brand Design → Identidad de marca · Performance y CRM → Pauta y Automatización
  // Web & SEO → Páginas web · Analítica & IA → Estrategia Digital
  function calcularServicios() {
    const s = { [ESTRATEGIA]: 20, [IDENTIDAD]: 20, [MARKETING]: 20, [PAUTA]: 20, [WEB]: 20 };
    const prioridad = respuesta(24);

    // Estrategia Digital (incluye lo que antes era Analítica e IA)
    if (es(4, ['Tengo ideas, pero no un plan', 'He probado varias cosas sin resultados claros', 'No sé por dónde empezar'])) s[ESTRATEGIA] += 35;
    if (respuesta(2) === 'Organizar mi marketing') s[ESTRATEGIA] += 20;
    if (prioridad === 'Definir una estrategia digital') s[ESTRATEGIA] += 30;
    if (es(22, ['No mido', 'No sé qué debería medir', 'Reviso varias herramientas, pero la información está regada'])) s[ESTRATEGIA] += 35;
    const datos = respuesta(23) || [];
    if (datos.includes('Tengo datos, pero no sé interpretarlos')) s[ESTRATEGIA] += 25;
    if (datos.includes('La información está regada')) s[ESTRATEGIA] += 20;
    if (datos.includes('No sé qué canal me trae más ventas')) s[ESTRATEGIA] += 20;
    if (es(21, ['Apenas estoy empezando a probarla', 'Sé que me puede ayudar, pero no sé cómo', 'No la uso'])) s[ESTRATEGIA] += 15;
    if (prioridad === 'Usar inteligencia artificial') s[ESTRATEGIA] += 40;
    if (prioridad === 'Entender mejor mis datos') s[ESTRATEGIA] += 40;

    // Identidad de marca
    if (es(8, ['Se ve desactualizada', 'No refleja lo que ofrezco', 'No tengo una identidad visual definida'])) s[IDENTIDAD] += 45;
    if (prioridad === 'Mejorar mi marca') s[IDENTIDAD] += 35;

    // Marketing y Contenidos
    if (es(10, ['Casi nunca', 'No publico', 'Cuando tengo tiempo'])) s[MARKETING] += 30;
    if (es(11, ['Publico sin una estrategia clara', 'No sé qué debería publicar', 'No tengo contenidos'])) s[MARKETING] += 30;
    if (prioridad === 'Mejorar mis redes y contenidos') s[MARKETING] += 35;

    // Pauta y Automatización (incluye lo que antes era Performance y CRM)
    if (es(12, ['No, pero quiero empezar', 'No hago publicidad'])) s[PAUTA] += 15;
    if (es(13, ['Invierto, pero no veo resultados', 'Me llegan muchos contactos que no sirven', 'No sé cómo medirla'])) s[PAUTA] += 40;
    if (prioridad === 'Mejorar mi publicidad') s[PAUTA] += 35;
    if (respuesta(2) === 'Conseguir más clientes') s[PAUTA] += 12;
    if (es(18, ['Algunos se quedan sin seguimiento', 'No tengo un proceso definido', 'No sé cuántos se me pierden'])) s[PAUTA] += 40;
    if (es(19, ['En Excel o Google Sheets', 'En varias herramientas que no se conectan', 'No llevo un registro organizado'])) s[PAUTA] += 25;
    if ((respuesta(20) || []).length >= 3) s[PAUTA] += 25;
    if (prioridad === 'Organizar mis contactos y clientes') s[PAUTA] += 40;
    if (prioridad === 'Automatizar procesos') s[PAUTA] += 40;

    // Páginas web (incluye aparecer en Google)
    if (es(7, ['Quiero crear una pronto', 'La necesito, pero no sé qué debería tener'])) s[WEB] += 40;
    if (es(6, ['Tiene visitas, pero pocos me escriben', 'Está desactualizada', 'Casi no me trae resultados'])) s[WEB] += 35;
    if (es(15, ['No sé', 'Casi no salgo', 'No tengo presencia en Google'])) s[WEB] += 30;
    if (es(16, ['Muy importante', 'Importante'])) s[WEB] += 20;
    if (prioridad === 'Aparecer mejor en Google') s[WEB] += 35;
    if (prioridad === 'Crear o mejorar mi página web') s[WEB] += 35;

    Object.keys(s).forEach((k) => { s[k] = Math.min(100, s[k]); });
    return s;
  }

  const ordenar = (servicios) => Object.entries(servicios).sort((a, b) => b[1] - a[1]);

  function nivelDe(puntaje) {
    if (puntaje < 40) return 'Nivel inicial';
    if (puntaje < 70) return 'En desarrollo';
    if (puntaje < 85) return 'Avanzado';
    return 'Consolidado';
  }

  function prioridadDe(valor) {
    if (valor >= 70) return 'Alta';
    if (valor >= 45) return 'Media';
    return 'Baja';
  }


  /* =====================================================================
     4. TEXTOS DEL RESULTADO (todo en "tú", sin vender nada)
     ===================================================================== */
  const TEXTO_NIVEL = {
    'Nivel inicial': 'Estás empezando. La buena noticia: con pocos cambios bien elegidos se nota la diferencia rápido.',
    'En desarrollo': 'Ya tienes cosas andando. Ahora toca ordenarlas para que trabajen juntas.',
    'Avanzado': 'Vas bien. Tus oportunidades están en afinar detalles y medir mejor.',
    'Consolidado': 'Tu negocio está muy bien parado en lo digital. El reto es seguir mejorando sin perder el ritmo.',
  };

  const TEXTO_OPORTUNIDAD = {
    [ESTRATEGIA]: 'Hoy tu mayor oportunidad está en ordenar: tener claro qué quieres lograr, en qué canales enfocarte y cómo vas a saber si está funcionando. Con eso, cada peso y cada hora te rinden más.',
    [IDENTIDAD]: 'Tu marca puede verse más profesional y coherente en todos lados. Cuando la gente te reconoce y te cree a primera vista, todo lo demás se vuelve más fácil.',
    [MARKETING]: 'Tu contenido puede trabajar más por tu negocio: publicar con un plan, hablarle a la gente correcta y convertir seguidores en conversaciones.',
    [PAUTA]: 'Tienes espacio para llegar a más gente con publicidad bien enfocada y para no dejar escapar a nadie: responder a tiempo, hacer seguimiento y tener tus contactos en orden.',
    [WEB]: 'Tu presencia en internet puede ayudarte mucho más: una página clara, que cargue rápido y aparezca en Google, convierte visitas en mensajes.',
  };

  const TEXTO_RECOMENDACION = {
    [ESTRATEGIA]: 'Define uno o dos objetivos para los próximos 3 meses, elige los canales que más te acercan a ellos y decide qué número vas a revisar cada semana.',
    [IDENTIDAD]: 'Revisa que tu logo, tus colores y tu forma de hablar sean iguales en redes, página y material para vender. Escribe en una frase qué te hace diferente.',
    [MARKETING]: 'Arma un calendario sencillo con temas que respondan las preguntas reales de tus clientes. Mejor poco y constante que mucho y de vez en cuando.',
    [PAUTA]: 'Antes de invertir más en publicidad, revisa a quién le hablas y qué pasa cuando alguien te escribe. Ten tus contactos en un solo lugar y automatiza respuestas y seguimiento.',
    [WEB]: 'Asegúrate de que tu página diga en segundos qué haces, tenga un botón claro para escribirte y aparezca en Google Maps y en las búsquedas de tu zona.',
  };

  function hallazgosDe(servicios) {
    const h = [];
    ordenar(servicios).slice(0, 3).forEach(([nombre, valor]) => {
      if (valor >= 55) h.push(`Hay una oportunidad clara en ${nombre}.`);
    });
    if (es(18, ['Algunos se quedan sin seguimiento', 'No tengo un proceso definido', 'No sé cuántos se me pierden'])) h.push('El seguimiento a las personas interesadas tiene mucho por mejorar.');
    if (es(15, ['No sé', 'Casi no salgo', 'No tengo presencia en Google'])) h.push('Puedes aparecer más en Google sin depender solo de la publicidad.');
    if (es(22, ['No mido', 'No sé qué debería medir'])) h.push('Todavía no tienes una forma clara de medir qué funciona.');
    if (respuesta(3) === 'No tengo una estrategia digital clara' || respuesta(4) === 'No sé por dónde empezar') h.push('Antes de hacer más cosas, vale la pena definir prioridades.');
    if (!h.length) h.push('Tu negocio tiene varias áreas con espacio para mejorar.');
    return h.slice(0, 5);
  }

  function recomendacionesDe(servicios) {
    const lista = ordenar(servicios).filter(([, v]) => v >= 45).slice(0, 3);
    const base = lista.length ? lista : ordenar(servicios).slice(0, 1);
    return base.map(([nombre]) => ({ titulo: nombre, texto: TEXTO_RECOMENDACION[nombre] }));
  }

  function mensajeWhatsApp(r) {
    const areas = r.areas.slice(0, 3).map(([n]) => n).join(', ');
    return [
      'Hola AImátika, acabo de hacer el diagnóstico digital gratis.',
      '',
      `Mi resultado: ${r.puntaje}/100 (${r.nivel})`,
      `Principal oportunidad: ${r.principal}`,
      `Áreas a revisar: ${areas}`,
      '',
      '¿Lo revisamos juntos?',
    ].join('\n');
  }
  const enlaceWhatsApp = (texto) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;


  /* =====================================================================
     5. UTILIDADES
     ===================================================================== */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Ruta base del sitio, calculada desde la ubicación de este archivo (js/diagnostico.js)
  const SCRIPT = document.currentScript;
  const RAIZ = SCRIPT ? new URL('../', SCRIPT.src) : new URL('./', location.href);
  const urlPrivacidad = URL_PRIVACIDAD || new URL('privacidad.html', RAIZ).href;

  // Escapa texto para meterlo en el HTML de los correos (evita código inyectado)
  const escapar = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // Limpia lo que escribe la persona: sin caracteres invisibles ni < >
  const INVISIBLES = new RegExp('[\u0000-\u001F\u007F​-‏  ﻿]', 'g');
  const limpiar = (v) => String(v || '').normalize('NFKC').replace(INVISIBLES, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();

  const conTiempo = (promesa, ms) => Promise.race([
    promesa,
    new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('Tiempo agotado')), ms)),
  ]);

  const icono = (id, clase = '') => `<svg class="${clase}" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;


  /* =====================================================================
     6. DIBUJO DEL PANEL
     Todo el HTML del panel vive aquí, para no tener que pegarlo en cada
     página. Los textos de las preguntas se ponen después con textContent.
     ===================================================================== */
  const ICONO_WA = icono('i-whatsapp');

  const HTML = `
  <div class="diag__fondo" data-diag-cerrar></div>
  <section class="diag__panel" role="dialog" aria-modal="true" aria-labelledby="diag-titulo" tabindex="-1">
    <header class="diag__cabecera">
      <button class="icono-btn diag__atras" type="button" data-diag-atras aria-label="Volver" hidden>${icono('i-flecha')}</button>
      <p class="diag__nombre" id="diag-titulo">Diagnóstico digital gratis</p>
      <button class="icono-btn" type="button" data-diag-cerrar aria-label="Cerrar el diagnóstico">${icono('i-cerrar')}</button>
    </header>

    <div class="diag__cuerpo" data-diag-cuerpo>

      <!-- Vista 1 · Inicio: dos caminos -->
      <div class="diag__vista" data-vista="inicio">
        <h2 class="diag__titulo" tabindex="-1">Veamos dónde está tu negocio hoy</h2>
        <p class="diag__intro">Es gratis y sin compromiso. Elige cómo prefieres hacerlo.</p>
        <div class="diag__caminos">
          <button class="diag__camino" type="button" data-ir="preguntas">
            <span class="diag__camino-icono">${icono('i-clock')}</span>
            <span class="diag__camino-texto">
              <strong>Quiero hacer el diagnóstico yo mismo</strong>
              <span>Son unos 5 a 8 minutos y al final te llega tu resultado al correo.</span>
            </span>
            ${icono('i-flecha', 'diag__camino-flecha')}
          </button>
          <button class="diag__camino" type="button" data-ir="contacto">
            <span class="diag__camino-icono">${icono('i-chats-circle')}</span>
            <span class="diag__camino-texto">
              <strong>Prefiero que me contacten</strong>
              <span>Déjanos tus datos y te llamamos o te escribimos por WhatsApp.</span>
            </span>
            ${icono('i-flecha', 'diag__camino-flecha')}
          </button>
        </div>
      </div>

      <!-- Vista 2 · Preguntas -->
      <div class="diag__vista" data-vista="preguntas" hidden>
        <div class="diag__progreso">
          <div class="diag__progreso-fila">
            <span data-diag-seccion></span>
            <span data-diag-contador></span>
          </div>
          <div class="diag__barra" role="progressbar" aria-label="Avance del diagnóstico" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span data-diag-barra></span></div>
        </div>
        <fieldset class="diag__pregunta" data-diag-pregunta>
          <legend class="diag__titulo" tabindex="-1" data-diag-titulo></legend>
          <p class="diag__ayuda" data-diag-ayuda></p>
          <div class="diag__opciones" data-diag-opciones></div>
        </fieldset>
        <p class="diag__error" data-diag-error role="alert"></p>
        <div class="diag__navegacion">
          <button class="btn btn--linea" type="button" data-diag-anterior>Anterior</button>
          <button class="btn btn--accion" type="button" data-diag-siguiente>Continuar ${icono('i-flecha', 'i-flecha')}</button>
        </div>
      </div>

      <!-- Vista 3 · Datos antes del resultado -->
      <div class="diag__vista" data-vista="datos" hidden>
        <h2 class="diag__titulo" tabindex="-1">¿A dónde te enviamos tu diagnóstico?</h2>
        <p class="diag__intro">Ya casi. Déjanos tus datos y te mostramos el resultado aquí mismo. También te llega una copia al correo.</p>
        <form class="diag__form" data-diag-form="datos" novalidate>
          ${camposPersona('d')}
          <div class="diag__form-acciones">
            <button class="btn btn--accion btn--grande" type="submit">Ver mi diagnóstico ${icono('i-flecha', 'i-flecha')}</button>
          </div>
        </form>
      </div>

      <!-- Vista 4 · Resultado -->
      <div class="diag__vista" data-vista="resultado" hidden>
        <h2 class="diag__titulo" tabindex="-1" data-diag-res-titulo>Este es tu diagnóstico</h2>
        <p class="diag__aviso" data-diag-aviso hidden></p>

        <div class="diag__puntaje">
          <p class="diag__puntaje-num"><span data-diag-puntaje>0</span><small>/100</small></p>
          <div>
            <p class="diag__nivel" data-diag-nivel></p>
            <p class="diag__nivel-texto" data-diag-nivel-texto></p>
          </div>
        </div>

        <div class="diag__oportunidad">
          <p class="diag__oportunidad-etiqueta">Tu principal oportunidad</p>
          <h3 data-diag-principal></h3>
          <p data-diag-principal-texto></p>
        </div>

        <h3 class="diag__subtitulo">Áreas que revisamos</h3>
        <ul class="diag__areas" data-diag-areas></ul>

        <h3 class="diag__subtitulo">Lo que encontramos</h3>
        <ul class="diag__hallazgos" data-diag-hallazgos></ul>

        <h3 class="diag__subtitulo">Por dónde empezar</h3>
        <ol class="diag__recomendaciones" data-diag-recomendaciones></ol>

        <div class="diag__cierre">
          <h3>¿Quieres que revisemos tu resultado juntos?</h3>
          <p>Es gratis y sin compromiso. Te explicamos qué significa y por dónde arrancar.</p>
          <a class="btn btn--accion btn--grande" data-diag-wa href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener noreferrer">${ICONO_WA} Escríbenos por WhatsApp</a>
        </div>
        <button class="diag__reiniciar" type="button" data-diag-reiniciar>Hacer el diagnóstico de nuevo</button>
      </div>

      <!-- Vista 5 · Prefiero que me contacten -->
      <div class="diag__vista" data-vista="contacto" hidden>
        <h2 class="diag__titulo" tabindex="-1">Te contactamos nosotros</h2>
        <p class="diag__intro">Déjanos tus datos y te buscamos para hacer el diagnóstico juntos. Es gratis.</p>
        <form class="diag__form" data-diag-form="contacto" novalidate>
          ${camposPersona('c', true)}
          <div class="diag__form-acciones">
            <button class="btn btn--accion btn--grande" type="submit">Enviar mis datos ${icono('i-flecha', 'i-flecha')}</button>
          </div>
        </form>
      </div>

      <!-- Vista 6 · Contacto enviado -->
      <div class="diag__vista diag__vista--listo" data-vista="contacto-listo" hidden>
        <span class="diag__listo-icono">${icono('i-check')}</span>
        <h2 class="diag__titulo" tabindex="-1">¡Listo! Te contactamos pronto</h2>
        <p class="diag__intro" data-diag-listo-texto>Recibimos tus datos. Te buscamos en horario laboral.</p>
        <button class="btn btn--linea" type="button" data-diag-cerrar>Cerrar</button>
      </div>

    </div>
  </section>`;

  // Campos de datos personales (se usan en "datos" y en "contacto")
  function camposPersona(p, conPreferencia = false) {
    const preferencia = conPreferencia ? `
      <fieldset class="campo campo--full diag__preferencia">
        <legend>¿Cómo prefieres que te contactemos?</legend>
        <div class="diag__chips">
          <label class="diag__chip"><input type="radio" name="preferencia" value="WhatsApp" checked><span>${ICONO_WA} WhatsApp</span></label>
          <label class="diag__chip"><input type="radio" name="preferencia" value="Llamada"><span>${icono('i-telefono')} Llamada</span></label>
        </div>
      </fieldset>` : '';
    return `
      <div class="campo campo--full">
        <label for="${p}-nombre">Tu nombre</label>
        <input id="${p}-nombre" name="nombre" type="text" autocomplete="given-name" maxlength="80" required>
        <p class="campo__error" id="${p}-nombre-error"></p>
      </div>
      <div class="campo campo--full">
        <label for="${p}-negocio">Nombre de tu negocio</label>
        <input id="${p}-negocio" name="negocio" type="text" autocomplete="organization" maxlength="100" required>
        <p class="campo__error" id="${p}-negocio-error"></p>
      </div>
      <div class="campo">
        <label for="${p}-correo">Correo</label>
        <input id="${p}-correo" name="correo" type="email" inputmode="email" autocomplete="email" maxlength="120" required>
        <p class="campo__error" id="${p}-correo-error"></p>
      </div>
      <div class="campo">
        <label for="${p}-celular">Celular</label>
        <input id="${p}-celular" name="celular" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="300 123 4567" required>
        <p class="campo__error" id="${p}-celular-error"></p>
      </div>
      ${preferencia}
      <div class="campo campo--check campo--full">
        <input id="${p}-acepto" name="acepto" type="checkbox" required>
        <label for="${p}-acepto">Autorizo a AImátika a tratar mis datos para contactarme, según la <a href="${escapar(urlPrivacidad)}" target="_blank" rel="noopener">política de tratamiento de datos</a> (Ley 1581 de 2012).</label>
        <p class="campo__error" id="${p}-acepto-error"></p>
      </div>
      <div class="campo-trampa" aria-hidden="true">
        <label for="${p}-sitio">No llenar</label>
        <input id="${p}-sitio" name="sitio_web" type="text" tabindex="-1" autocomplete="off">
      </div>
      <p class="formulario__estado" data-diag-estado role="status"></p>`;
  }

  // Se crea el panel una sola vez
  const raiz = document.createElement('div');
  raiz.className = 'diag';
  raiz.id = 'diagnostico';
  raiz.hidden = true;
  raiz.innerHTML = HTML;
  document.body.appendChild(raiz);

  const panel = $('.diag__panel', raiz);
  const cuerpo = $('[data-diag-cuerpo]', raiz);
  const btnAtras = $('[data-diag-atras]', raiz);
  let vistaActual = 'inicio';
  let disparador = null;   // botón que abrió el panel (para devolverle el foco)


  /* =====================================================================
     7. ABRIR Y CERRAR
     ===================================================================== */
  const DURACION_CIERRE = 260;  // igual que en diagnostico.css
  let inertesPrevios = [];

  function abrir(origen) {
    if (raiz.classList.contains('is-open')) return;
    disparador = origen || document.activeElement;
    cargarEmailJS().catch(() => {});   // se adelanta la descarga; si falla, se reintenta al enviar
    // Si ya terminó el contacto, al volver a abrir empieza desde el inicio
    if (vistaActual === 'contacto-listo') mostrarVista('inicio', false);

    raiz.hidden = false;
    // Doble cuadro: primero se pinta cerrado y luego se anima la entrada
    requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.add('is-open')));

    document.body.classList.add('sin-scroll', 'con-diagnostico');
    inertesPrevios = $$('body > *:not(.diag):not(script):not(svg)').map((el) => [el, el.inert]);
    inertesPrevios.forEach(([el]) => { el.inert = true; });

    setTimeout(() => enfocarVista(), menosMovimiento.matches ? 0 : 120);
  }

  function cerrar() {
    if (!raiz.classList.contains('is-open')) return;
    raiz.classList.remove('is-open');
    inertesPrevios.forEach(([el, antes]) => { el.inert = antes; });
    inertesPrevios = [];
    document.body.classList.remove('con-diagnostico');
    const menuAbierto = $('#menu-movil.is-open');
    if (!menuAbierto) document.body.classList.remove('sin-scroll');
    setTimeout(() => {
      if (!raiz.classList.contains('is-open')) raiz.hidden = true;
    }, menosMovimiento.matches ? 0 : DURACION_CIERRE);
    if (disparador && document.contains(disparador)) disparador.focus({ preventScroll: true });
  }

  // Cualquier enlace a la página de contacto con #formulario (o con data-diagnostico) abre el panel
  document.addEventListener('click', (e) => {
    const enlace = e.target.closest('a[href*="#formulario"], [data-diagnostico]');
    if (!enlace || raiz.contains(enlace)) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return; // abrir en pestaña nueva sigue funcionando
    e.preventDefault();
    abrir(enlace);
  });

  raiz.addEventListener('click', (e) => {
    if (e.target.closest('[data-diag-cerrar]')) cerrar();
    const ir = e.target.closest('[data-ir]');
    if (ir) {
      if (ir.dataset.ir === 'preguntas') {
        mostrarVista(resultado ? 'resultado' : (datosPendientes() ? 'datos' : 'preguntas'));
      } else {
        mostrarVista(ir.dataset.ir);
      }
    }
  });

  // Flecha de arriba: sube un nivel (preguntas → inicio, datos → última pregunta, contacto → inicio)
  btnAtras.addEventListener('click', () => {
    if (vistaActual === 'preguntas') { guardarSinObligar(); mostrarVista('inicio'); return; }
    if (vistaActual === 'datos') { indice = preguntasActivas().length - 1; mostrarVista('preguntas'); return; }
    mostrarVista('inicio');
  });

  // Teclado: Esc cierra; Tab no se sale del panel
  document.addEventListener('keydown', (e) => {
    if (!raiz.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
    if (e.key !== 'Tab') return;
    const enfocables = $$('a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), [tabindex="0"]', panel)
      .filter((el) => el.offsetParent !== null && !el.closest('[hidden]'));
    if (!enfocables.length) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (e.shiftKey && (document.activeElement === primero || document.activeElement === panel)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  });

  // Cambia de vista con una transición corta
  function mostrarVista(nombre, animar = true) {
    $$('[data-vista]', raiz).forEach((v) => {
      const activa = v.dataset.vista === nombre;
      v.hidden = !activa;
      if (activa && animar) reanimar(v, 'is-entrando');
    });
    vistaActual = nombre;
    btnAtras.hidden = ['inicio', 'resultado', 'contacto-listo'].includes(nombre);
    if (nombre === 'preguntas') pintarPregunta(false);
    cuerpo.scrollTop = 0;
    if (raiz.classList.contains('is-open')) enfocarVista();
  }

  function enfocarVista() {
    const vista = $(`[data-vista="${vistaActual}"]`, raiz);
    const destino = vista && $('.diag__titulo', vista);
    (destino || panel).focus({ preventScroll: true });
  }

  // Vuelve a disparar una animación CSS (para cada vista o pregunta nueva)
  function reanimar(el, clase) {
    if (menosMovimiento.matches) return;
    el.classList.remove(clase);
    void el.offsetWidth;   // obliga al navegador a "olvidar" la animación anterior
    el.classList.add(clase);
  }


  /* =====================================================================
     8. PREGUNTAS
     ===================================================================== */
  const elSeccion = $('[data-diag-seccion]', raiz);
  const elContador = $('[data-diag-contador]', raiz);
  const elBarra = $('[data-diag-barra]', raiz);
  const elBarraCaja = $('.diag__barra', raiz);
  const elPregunta = $('[data-diag-pregunta]', raiz);
  const elTitulo = $('[data-diag-titulo]', raiz);
  const elAyuda = $('[data-diag-ayuda]', raiz);
  const elOpciones = $('[data-diag-opciones]', raiz);
  const elError = $('[data-diag-error]', raiz);
  const btnAnterior = $('[data-diag-anterior]', raiz);
  const btnSiguiente = $('[data-diag-siguiente]', raiz);

  const datosPendientes = () => !resultado && Object.keys(respuestas).length > 0 && indice >= preguntasActivas().length;

  function pintarPregunta(animar = true) {
    const activas = preguntasActivas();
    if (indice >= activas.length) { mostrarVista('datos'); return; }
    const q = activas[indice];
    const avance = Math.round((indice / activas.length) * 100);

    elSeccion.textContent = q.section;
    elContador.textContent = `${indice + 1} de ${activas.length}`;
    elBarra.style.transform = `scaleX(${Math.max(0.03, (indice + 1) / activas.length)})`;
    elBarraCaja.setAttribute('aria-valuenow', String(avance));
    elTitulo.textContent = q.title;
    elAyuda.textContent = q.description || '';
    elError.textContent = '';

    elOpciones.textContent = '';
    elOpciones.classList.toggle('diag__opciones--varias', q.type === 'multiple');
    const actual = respuestas[q.id];
    q.options.forEach((opcion, i) => {
      const label = document.createElement('label');
      label.className = 'diag__opcion';
      const input = document.createElement('input');
      input.type = q.type === 'multiple' ? 'checkbox' : 'radio';
      input.name = `p${q.id}`;
      input.value = opcion;
      input.id = `diag-p${q.id}-${i}`;
      input.checked = Array.isArray(actual) ? actual.includes(opcion) : actual === opcion;
      const marca = document.createElement('span');
      marca.className = 'diag__marca';
      marca.setAttribute('aria-hidden', 'true');
      const texto = document.createElement('span');
      texto.textContent = opcion;
      label.append(input, marca, texto);
      elOpciones.appendChild(label);
    });

    btnAnterior.textContent = indice === 0 ? 'Volver' : 'Anterior';
    const ultima = indice === activas.length - 1;
    btnSiguiente.firstChild.textContent = ultima ? 'Terminar ' : 'Continuar ';

    if (animar) {
      reanimar(elPregunta, 'is-entrando');
      cuerpo.scrollTop = 0;
      elTitulo.focus({ preventScroll: true });
    }
  }

  // "Ninguno" y "Todo lo anterior" no se mezclan con las demás opciones
  elOpciones.addEventListener('change', (e) => {
    const input = e.target;
    elError.textContent = '';
    if (input.type !== 'checkbox' || !input.checked) return;
    const exclusivas = ['Ninguno', 'Todo lo anterior', 'No sé qué podría automatizar'];
    const todas = $$('input', elOpciones);
    if (exclusivas.includes(input.value)) todas.forEach((o) => { if (o !== input) o.checked = false; });
    else todas.forEach((o) => { if (exclusivas.includes(o.value)) o.checked = false; });
  });

  function guardarRespuesta() {
    const q = preguntasActivas()[indice];
    if (!q) return true;
    const marcadas = $$('input:checked', elOpciones).map((i) => i.value);
    if (!marcadas.length) return false;
    respuestas[q.id] = q.type === 'multiple' ? marcadas : marcadas[0];
    // Si cambió una respuesta que activa otras preguntas, se borran las que ya no aplican
    PREGUNTAS.forEach((p) => { if (p.condition && !p.condition()) delete respuestas[p.id]; });
    return true;
  }

  function siguiente() {
    if (!guardarRespuesta()) {
      const q = preguntasActivas()[indice];
      elError.textContent = q.type === 'multiple' ? 'Elige al menos una opción para seguir.' : 'Elige una opción para seguir.';
      return;
    }
    indice++;
    if (indice >= preguntasActivas().length) { mostrarVista('datos'); return; }
    pintarPregunta();
  }

  // Guarda lo que haya marcado, sin obligar a elegir (para devolverse sin perder nada)
  function guardarSinObligar() {
    const q = preguntasActivas()[indice];
    const marcadas = $$('input:checked', elOpciones).map((i) => i.value);
    if (q && marcadas.length) respuestas[q.id] = q.type === 'multiple' ? marcadas : marcadas[0];
  }

  function anterior() {
    guardarSinObligar();
    if (indice === 0) { mostrarVista('inicio'); return; }
    indice--;
    pintarPregunta();
  }

  btnSiguiente.addEventListener('click', siguiente);
  btnAnterior.addEventListener('click', anterior);

  // Doble clic (o doble toque) en una opción de selección única = continuar
  elOpciones.addEventListener('dblclick', (e) => {
    if (e.target.closest('.diag__opcion') && !elOpciones.classList.contains('diag__opciones--varias')) siguiente();
  });

  $('[data-diag-reiniciar]', raiz).addEventListener('click', () => {
    Object.keys(respuestas).forEach((k) => delete respuestas[k]);
    indice = 0;
    resultado = null;
    mostrarVista('preguntas');
  });


  /* =====================================================================
     9. DATOS DE LA PERSONA (validación) Y ENVÍO DEL DIAGNÓSTICO
     ===================================================================== */
  const reglas = {
    nombre: (v) => (v.length >= 2 && /^[\p{L}\p{M}' .-]+$/u.test(v)) || 'Escribe tu nombre (solo letras).',
    negocio: (v) => v.length >= 2 || 'Escribe el nombre de tu negocio.',
    correo: (v) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(v) || 'Revisa tu correo, parece que le falta algo. Ejemplo: nombre@correo.com',
    celular: (v) => celularValido(v) || 'Escribe un celular válido. Ejemplo: 300 123 4567',
    acepto: (v) => v === true || 'Necesitamos tu autorización para enviarte el resultado y contactarte.',
  };

  // Celular colombiano (3XX XXX XXXX), con o sin +57, o un número internacional con +
  function celularValido(v) {
    if (!/^\+?[\d\s()-]{7,20}$/.test(v)) return false;
    const n = v.replace(/\D/g, '');
    if (/^3\d{9}$/.test(n) || /^573\d{9}$/.test(n)) return true;
    return v.trim().startsWith('+') && n.length >= 8 && n.length <= 15;
  }

  function validarCampo(el) {
    const regla = reglas[el.name];
    if (!regla) return true;
    const v = el.type === 'checkbox' ? el.checked : limpiar(el.value);
    const r = regla(v);
    const ok = r === true;
    const caja = el.closest('.campo');
    caja.classList.toggle('is-error', !ok);
    el.setAttribute('aria-invalid', String(!ok));
    const err = $('.campo__error', caja);
    if (err) { err.textContent = ok ? '' : r; el.setAttribute('aria-describedby', err.id); }
    return ok;
  }

  function leerFormulario(form) {
    const campos = [...form.elements].filter((el) => el.name in reglas);
    const malos = campos.filter((c) => !validarCampo(c));
    if (malos.length) { malos[0].focus(); return null; }
    const pref = form.elements.preferencia;
    return {
      nombre: limpiar(form.elements.nombre.value).slice(0, 80),
      negocio: limpiar(form.elements.negocio.value).slice(0, 100),
      correo: limpiar(form.elements.correo.value).slice(0, 120),
      celular: limpiar(form.elements.celular.value).slice(0, 20),
      preferencia: pref ? pref.value : '',
    };
  }

  $$('[data-diag-form]', raiz).forEach((form) => {
    form.addEventListener('focusout', (e) => { if (e.target.name in reglas && e.target.value) validarCampo(e.target); });
    form.addEventListener('input', (e) => { if (e.target.closest('.campo.is-error')) validarCampo(e.target); });
    form.addEventListener('change', (e) => { if (e.target.type === 'checkbox') validarCampo(e.target); });
  });

  const formDatos = $('[data-diag-form="datos"]', raiz);
  formDatos.addEventListener('submit', async (e) => {
    e.preventDefault();
    const estado = $('[data-diag-estado]', formDatos);
    estado.textContent = '';
    const d = leerFormulario(formDatos);
    if (!d) return;
    datosPersona = d;

    // Campo trampa lleno = robot: se muestra el resultado pero no se envía nada
    const esRobot = !!formDatos.elements.sitio_web.value;

    resultado = calcularResultado();
    const boton = $('button[type="submit"]', formDatos);
    ocupado(boton, true, 'Preparando tu diagnóstico…');

    let correoOk = false;
    if (!esRobot) {
      const envios = await Promise.allSettled([
        enviarCorreo(EMAILJS.plantillaPersona, {
          to_email: d.correo,
          to_name: d.nombre,
          reply_to: CORREO_EQUIPO,
          asunto: `${d.nombre}, este es tu diagnóstico digital`,
          contenido_html: correoPersona(resultado, d),
        }),
        enviarCorreo(EMAILJS.plantillaEquipo, {
          to_email: CORREO_EQUIPO,
          to_name: 'Equipo AImátika',
          reply_to: d.correo,
          asunto: `Nuevo diagnóstico: ${d.nombre} (${d.negocio}) · ${resultado.puntaje}/100`,
          contenido_html: correoEquipoDiagnostico(resultado, d),
        }),
        enviarHubSpot(d, resumenTexto(resultado, d)),
      ]);
      correoOk = envios[0].status === 'fulfilled';
      envios.forEach((r) => { if (r.status === 'rejected') console.warn('[Diagnóstico] Un envío falló:', r.reason); });
    }

    ocupado(boton, false);
    pintarResultado(resultado, d, correoOk || esRobot);
    mostrarVista('resultado');
  });

  function ocupado(boton, si, texto) {
    if (si) {
      boton.dataset.textoOriginal = boton.innerHTML;
      boton.textContent = texto;
      boton.classList.add('is-enviando');
      boton.setAttribute('aria-disabled', 'true');
    } else if (boton.dataset.textoOriginal) {
      boton.innerHTML = boton.dataset.textoOriginal;
      boton.classList.remove('is-enviando');
      boton.removeAttribute('aria-disabled');
    }
  }

  function calcularResultado() {
    const puntaje = calcularPuntaje();
    const servicios = calcularServicios();
    const areas = ordenar(servicios);
    const principal = areas[0][0];
    return {
      puntaje,
      nivel: nivelDe(puntaje),
      principal,
      areas,
      hallazgos: hallazgosDe(servicios),
      recomendaciones: recomendacionesDe(servicios),
      preguntas: preguntasActivas()
        .filter((q) => respuestas[q.id] !== undefined)
        .map((q) => ({ seccion: q.section, pregunta: q.title, respuesta: [].concat(respuestas[q.id]).join(', ') })),
    };
  }


  /* =====================================================================
     10. MOSTRAR EL RESULTADO
     ===================================================================== */
  function pintarResultado(r, d, correoOk) {
    const nombreCorto = d.nombre.split(' ')[0];
    $('[data-diag-res-titulo]', raiz).textContent = `${nombreCorto}, este es tu diagnóstico`;

    const aviso = $('[data-diag-aviso]', raiz);
    aviso.hidden = false;
    aviso.dataset.tipo = correoOk ? 'ok' : 'error';
    aviso.textContent = correoOk
      ? `Te enviamos una copia a ${d.correo}. Si no la ves, revisa la carpeta de spam.`
      : 'No pudimos enviarte el correo en este momento, pero aquí tienes tu resultado completo. Si quieres, escríbenos por WhatsApp y te lo mandamos.';

    contarHasta($('[data-diag-puntaje]', raiz), r.puntaje);
    $('[data-diag-nivel]', raiz).textContent = r.nivel;
    $('[data-diag-nivel-texto]', raiz).textContent = TEXTO_NIVEL[r.nivel];
    $('[data-diag-principal]', raiz).textContent = r.principal;
    $('[data-diag-principal-texto]', raiz).textContent = TEXTO_OPORTUNIDAD[r.principal];

    const areas = $('[data-diag-areas]', raiz);
    areas.textContent = '';
    r.areas.forEach(([nombre, valor]) => {
      const li = document.createElement('li');
      const n = document.createElement('span');
      n.textContent = nombre;
      const p = document.createElement('span');
      const nivel = prioridadDe(valor);
      p.className = `diag__prioridad diag__prioridad--${nivel.toLowerCase()}`;
      p.textContent = `Prioridad ${nivel.toLowerCase()}`;
      li.append(n, p);
      areas.appendChild(li);
    });

    const hallazgos = $('[data-diag-hallazgos]', raiz);
    hallazgos.textContent = '';
    r.hallazgos.forEach((t) => {
      const li = document.createElement('li');
      li.insertAdjacentHTML('afterbegin', icono('i-check'));
      const s = document.createElement('span');
      s.textContent = t;
      li.appendChild(s);
      hallazgos.appendChild(li);
    });

    const recs = $('[data-diag-recomendaciones]', raiz);
    recs.textContent = '';
    r.recomendaciones.forEach((rec) => {
      const li = document.createElement('li');
      const h = document.createElement('h4');
      h.textContent = rec.titulo;
      const p = document.createElement('p');
      p.textContent = rec.texto;
      li.append(h, p);
      recs.appendChild(li);
    });

    $('[data-diag-wa]', raiz).href = enlaceWhatsApp(mensajeWhatsApp(r));
  }

  // El número del puntaje sube de 0 al valor final
  function contarHasta(el, final) {
    if (menosMovimiento.matches) { el.textContent = final; return; }
    const inicio = performance.now();
    const dur = 900;
    const paso = (t) => {
      const k = Math.min(1, (t - inicio) / dur);
      const suave = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(final * suave);
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }


  /* =====================================================================
     11. "PREFIERO QUE ME CONTACTEN"
     ===================================================================== */
  const formContacto = $('[data-diag-form="contacto"]', raiz);
  formContacto.addEventListener('submit', async (e) => {
    e.preventDefault();
    const estado = $('[data-diag-estado]', formContacto);
    estado.textContent = '';
    const d = leerFormulario(formContacto);
    if (!d) return;

    const boton = $('button[type="submit"]', formContacto);
    const texto = $('[data-diag-listo-texto]', raiz);
    const viaTexto = d.preferencia === 'Llamada' ? `te llamamos al ${d.celular}` : `te escribimos por WhatsApp al ${d.celular}`;

    if (formContacto.elements.sitio_web.value) {   // robot: se finge éxito
      texto.textContent = `Gracias, ${d.nombre.split(' ')[0]}. Pronto ${viaTexto}.`;
      mostrarVista('contacto-listo');
      return;
    }

    ocupado(boton, true, 'Enviando…');
    const envios = await Promise.allSettled([
      enviarCorreo(EMAILJS.plantillaEquipo, {
        to_email: CORREO_EQUIPO,
        to_name: 'Equipo AImátika',
        reply_to: d.correo,
        asunto: `Quiere que lo contacten: ${d.nombre} (${d.negocio}) por ${d.preferencia}`,
        contenido_html: correoEquipoContacto(d),
      }),
      enviarHubSpot(d, `Pidió que lo contactemos para hacer el diagnóstico. Prefiere: ${d.preferencia}.`),
    ]);
    ocupado(boton, false);
    envios.forEach((r) => { if (r.status === 'rejected') console.warn('[Diagnóstico] Un envío falló:', r.reason); });

    if (envios.some((r) => r.status === 'fulfilled')) {
      texto.textContent = `Gracias, ${d.nombre.split(' ')[0]}. Pronto ${viaTexto}.`;
      formContacto.reset();
      mostrarVista('contacto-listo');
    } else {
      estado.dataset.tipo = 'error';
      estado.textContent = '';
      estado.append('No pudimos enviar tus datos en este momento. ');
      const a = document.createElement('a');
      a.href = enlaceWhatsApp(`Hola AImátika, soy ${d.nombre} de ${d.negocio}. Quiero hacer el diagnóstico gratis.`);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'Escríbenos por WhatsApp';
      estado.append(a, ' y te atendemos de una.');
    }
  });


  /* =====================================================================
     12. ENVÍOS
     ===================================================================== */
  const emailjsConfigurado = () => !Object.values(EMAILJS).some((v) => !v || v.startsWith('PEGA_AQUI'));
  let promesaSDK = null;

  // Carga la librería de EmailJS una sola vez (desde internet)
  function cargarEmailJS() {
    if (!emailjsConfigurado()) return Promise.reject(new Error('EmailJS sin configurar: faltan las claves en js/diagnostico.js'));
    if (promesaSDK) return promesaSDK;
    promesaSDK = new Promise((resolver, rechazar) => {
      if (window.emailjs) { resolver(window.emailjs); return; }
      const s = document.createElement('script');
      s.src = SDK_EMAILJS;
      s.async = true;
      s.onload = () => {
        if (!window.emailjs) { rechazar(new Error('EmailJS no cargó')); return; }
        window.emailjs.init({ publicKey: EMAILJS.publicKey });
        resolver(window.emailjs);
      };
      s.onerror = () => { promesaSDK = null; rechazar(new Error('No se pudo descargar EmailJS')); };
      document.head.appendChild(s);
    });
    promesaSDK.catch(() => {});   // evita avisos de error si nadie la espera todavía
    return promesaSDK;
  }

  async function enviarCorreo(plantilla, datos) {
    const emailjs = await conTiempo(cargarEmailJS(), ESPERA_MAXIMA);
    return conTiempo(emailjs.send(EMAILJS.serviceId, plantilla, datos), ESPERA_MAXIMA);
  }

  // API pública de formularios de HubSpot (no necesita clave secreta)
  async function enviarHubSpot(d, resumen) {
    const valores = { nombre: d.nombre, negocio: d.negocio, correo: d.correo, celular: d.celular, resumen };
    const fields = Object.entries(HUBSPOT.campos)
      .filter(([clave]) => valores[clave])
      .map(([clave, nombreHubSpot]) => ({ objectTypeId: '0-1', name: nombreHubSpot, value: String(valores[clave]).slice(0, 5000) }));
    const url = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT.portalId}/${HUBSPOT.formId}`;
    const cuerpoHS = {
      fields,
      context: { pageUri: location.href, pageName: document.title },
      legalConsentOptions: {
        consent: {
          consentToProcess: true,
          text: 'Autorizo a AImátika a tratar mis datos para contactarme, según la política de tratamiento de datos (Ley 1581 de 2012).',
        },
      },
    };
    const enviar = (b) => conTiempo(fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(b),
    }), ESPERA_MAXIMA);
    let respuestaHS = await enviar(cuerpoHS);
    // Si el formulario de HubSpot no tiene activado el consentimiento, se reintenta sin él
    if (respuestaHS.status === 400) {
      delete cuerpoHS.legalConsentOptions;
      respuestaHS = await enviar(cuerpoHS);
    }
    if (!respuestaHS.ok) throw new Error(`HubSpot respondió ${respuestaHS.status}`);
    return true;
  }

  function resumenTexto(r, d) {
    const lineas = [
      `Diagnóstico digital: ${r.puntaje}/100 (${r.nivel})`,
      `Principal oportunidad: ${r.principal}`,
      `Áreas: ${r.areas.map(([n, v]) => `${n} (prioridad ${prioridadDe(v).toLowerCase()})`).join(', ')}`,
      '',
      ...r.preguntas.map((p) => `${p.pregunta}\n→ ${p.respuesta}`),
    ];
    return lineas.join('\n');
  }


  /* =====================================================================
     13. CORREOS (diseño HTML con estilos en línea, para que se vean bien
     en Gmail, Outlook y el celular). Colores AImátika: negro #0A0A0A,
     azul Aurora #026C9A, turquesa #0291B9 y fucsia #D6249C para el botón.
     ===================================================================== */
  const C = { negro: '#0A0A0A', azul: '#026C9A', turquesa: '#0291B9', fucsia: '#D6249C', gris: '#5B6472', linea: '#E6E8EC', fondo: '#F4F4F2', lima: '#D4F80A' };
  const FUENTE = 'font-family:Arial,Helvetica,sans-serif;';

  function marcoCorreo(contenido) {
    return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fondo};padding:24px 0;${FUENTE}">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:14px;overflow:hidden;">
      <tr><td style="background:${C.negro};background-image:linear-gradient(120deg,#020102 0%,#011238 45%,#023B63 75%,#026C9A 100%);padding:28px 32px;">
        <p style="margin:0;color:#FFFFFF;font-size:22px;font-weight:800;letter-spacing:-0.5px;${FUENTE}">AImátika</p>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;${FUENTE}">Marketing Estratégico &amp; IA</p>
      </td></tr>
      <tr><td style="padding:32px;color:${C.negro};font-size:15px;line-height:1.6;${FUENTE}">
        ${contenido}
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid ${C.linea};color:${C.gris};font-size:12px;line-height:1.5;${FUENTE}">
        AImátika · Medellín, Colombia · <a href="https://www.aimatika.com" style="color:${C.azul};">www.aimatika.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>`;
  }

  const tituloSeccion = (t) => `<p style="margin:28px 0 10px;font-size:13px;font-weight:700;color:${C.gris};${FUENTE}">${escapar(t)}</p>`;

  function filasAreas(r) {
    const colores = { Alta: [C.lima, C.negro], Media: ['#E3F4F9', C.azul], Baja: [C.fondo, C.gris] };
    return r.areas.map(([n, v]) => {
      const nivel = prioridadDe(v);
      const [bg, fg] = colores[nivel];
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${C.linea};font-size:15px;font-weight:700;${FUENTE}">${escapar(n)}</td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${C.linea};${FUENTE}"><span style="display:inline-block;padding:4px 10px;border-radius:6px;background:${bg};color:${fg};font-size:12px;font-weight:700;">Prioridad ${nivel.toLowerCase()}</span></td>
      </tr>`;
    }).join('');
  }

  function correoPersona(r, d) {
    const nombre = escapar(d.nombre.split(' ')[0]);
    const hallazgos = r.hallazgos.map((h) => `<li style="margin:0 0 8px;">${escapar(h)}</li>`).join('');
    const recs = r.recomendaciones.map((x, i) => `
      <tr><td style="padding:0 0 14px;${FUENTE}">
        <p style="margin:0;font-size:15px;font-weight:700;">${i + 1}. ${escapar(x.titulo)}</p>
        <p style="margin:4px 0 0;color:${C.gris};font-size:14px;">${escapar(x.texto)}</p>
      </td></tr>`).join('');
    return marcoCorreo(`
      <p style="margin:0 0 6px;font-size:24px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">Hola, ${nombre}. Este es tu diagnóstico</p>
      <p style="margin:0;color:${C.gris};">Gracias por tomarte el tiempo de responder. Aquí está el resultado de ${escapar(d.negocio)}.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border:1px solid ${C.linea};border-radius:12px;">
        <tr><td style="padding:20px 24px;${FUENTE}">
          <p style="margin:0;font-size:44px;font-weight:800;letter-spacing:-1px;line-height:1;color:${C.negro};">${r.puntaje}<span style="font-size:18px;color:${C.gris};font-weight:700;">/100</span></p>
          <p style="margin:8px 0 0;font-size:16px;font-weight:700;color:${C.azul};">${escapar(r.nivel)}</p>
          <p style="margin:4px 0 0;color:${C.gris};font-size:14px;">${escapar(TEXTO_NIVEL[r.nivel])}</p>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;border-radius:12px;background:#023B63;background-image:linear-gradient(135deg,#011238 0%,#023B63 55%,#026C9A 100%);">
        <tr><td style="padding:22px 24px;color:#FFFFFF;${FUENTE}">
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);">Tu principal oportunidad</p>
          <p style="margin:6px 0 8px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">${escapar(r.principal)}</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.88);">${escapar(TEXTO_OPORTUNIDAD[r.principal])}</p>
        </td></tr>
      </table>

      ${tituloSeccion('Áreas que revisamos')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filasAreas(r)}</table>

      ${tituloSeccion('Lo que encontramos')}
      <ul style="margin:0;padding:0 0 0 18px;font-size:15px;">${hallazgos}</ul>

      ${tituloSeccion('Por dónde empezar')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${recs}</table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;background:${C.fondo};border-radius:12px;">
        <tr><td style="padding:24px;${FUENTE}">
          <p style="margin:0;font-size:18px;font-weight:800;">¿Quieres que revisemos tu resultado juntos?</p>
          <p style="margin:6px 0 18px;color:${C.gris};font-size:14px;">Es gratis y sin compromiso. Te explicamos qué significa y por dónde arrancar.</p>
          <a href="${escapar(enlaceWhatsApp(mensajeWhatsApp(r)))}" style="display:inline-block;padding:14px 22px;border-radius:6px;background:${C.fucsia};color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;${FUENTE}">Escríbenos por WhatsApp</a>
        </td></tr>
      </table>`);
  }

  function tablaDatos(d, extra = []) {
    const filas = [
      ['Nombre', d.nombre], ['Negocio', d.negocio], ['Correo', d.correo], ['Celular', d.celular], ...extra,
    ];
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas.map(([k, v]) => `
      <tr><td style="padding:8px 0;border-bottom:1px solid ${C.linea};color:${C.gris};font-size:13px;width:120px;${FUENTE}">${escapar(k)}</td>
      <td style="padding:8px 0;border-bottom:1px solid ${C.linea};font-size:15px;font-weight:700;${FUENTE}">${escapar(v)}</td></tr>`).join('')}</table>`;
  }

  function botonesEquipo(d) {
    const tel = d.celular.replace(/\D/g, '');
    const wa = tel.length === 10 ? `57${tel}` : tel;
    return `<p style="margin:16px 0 0;${FUENTE}">
      <a href="https://wa.me/${escapar(wa)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:6px;background:${C.negro};color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;">Escribirle por WhatsApp</a>
      <a href="mailto:${escapar(d.correo)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:6px;border:1px solid ${C.negro};color:${C.negro};font-size:14px;font-weight:700;text-decoration:none;">Responder por correo</a>
    </p>`;
  }

  function correoEquipoDiagnostico(r, d) {
    const preguntas = r.preguntas.map((p, i) => `
      <tr><td style="padding:10px 0;border-bottom:1px solid ${C.linea};${FUENTE}">
        <p style="margin:0;color:${C.gris};font-size:12px;">${i + 1}. ${escapar(p.seccion)}</p>
        <p style="margin:2px 0 0;font-size:14px;">${escapar(p.pregunta)}</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:700;">${escapar(p.respuesta)}</p>
      </td></tr>`).join('');
    return marcoCorreo(`
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">Nuevo diagnóstico completado</p>
      <p style="margin:0 0 16px;color:${C.gris};">${escapar(d.nombre)} de ${escapar(d.negocio)} terminó el diagnóstico en la web.</p>
      ${tablaDatos(d)}
      ${botonesEquipo(d)}
      ${tituloSeccion('Resultado')}
      <p style="margin:0;font-size:28px;font-weight:800;">${r.puntaje}/100 <span style="font-size:16px;color:${C.azul};">${escapar(r.nivel)}</span></p>
      <p style="margin:6px 0 0;font-size:15px;">Principal oportunidad: <strong>${escapar(r.principal)}</strong></p>
      ${tituloSeccion('Áreas prioritarias')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filasAreas(r)}</table>
      ${tituloSeccion(`Todas sus respuestas (${r.preguntas.length})`)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${preguntas}</table>`);
  }

  function correoEquipoContacto(d) {
    return marcoCorreo(`
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">Alguien quiere que lo contactemos</p>
      <p style="margin:0 0 16px;color:${C.gris};">Pidió hacer el diagnóstico gratis con nosotros. Prefiere que lo contactemos por <strong style="color:${C.negro};">${escapar(d.preferencia)}</strong>.</p>
      ${tablaDatos(d, [['Prefiere', d.preferencia]])}
      ${botonesEquipo(d)}`);
  }
})();

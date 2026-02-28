# 🚀 Noxwork GEDCOM Labs - Strategic Plan

## 🎯 Objetivo
Desarrollar una webapp de alto rendimiento para visualizar árboles genealógicos complejos utilizando archivos GEDCOM, orientada a demostrar capacidades de ingeniería Senior con React y NestJS.

## 🛠️ Stack Tecnológico
- **Frontend:** React 19 + TypeScript + Vite.
- **Visualización:** React Flow (Diagramación de grafos).
- **Backend:** NestJS (Node.js) + TypeScript.
- **Estilos:** Tailwind CSS (Paleta Noxwork: Azul Cobalto y Naranja  #0047AB Blue, #FF8C00 Orange).
- **Arquitectura:** Repositorios separados (Decoupled Architecture).

## 🏗️ Arquitectura de Datos
1. **Parser:** Conversión de GEDCOM (Niveles 0, 1, 2) a un Modelo de Grafo.
2. **Normalización:** Identificación de IDs únicos (@I1@, @F1@) para evitar duplicidad en casos de relaciones cruzadas.
3. **Layout Engine:** Implementación de Dagre para el posicionamiento automático de nodos según generación y edad.

## 📝 Casos de Prueba Críticos
- [ ] Carga de archivos de >10,000 registros (Performance).
- [ ] Renderizado de relaciones no convencionales (Caso "Hijo-Tío-Primo").
- [ ] Exportación del árbol visualizado a PDF/PNG.

## 📂 Estructura de Repositorios

### 1. Backend: `noxwork-gedcom-api` (NestJS)
Este repositorio se encarga del procesamiento pesado, validación de archivos y cálculo de relaciones complejas.

```text
noxwork-gedcom-api/
├── src/
│   ├── app.module.ts            # Punto de entrada de módulos
│   ├── main.ts                  # Configuración de servidor y CORS
│   ├── gedcom/                  # Dominio principal
│   │   ├── gedcom.module.ts
│   │   ├── gedcom.controller.ts # Endpoints (POST /upload, GET /parse)
│   │   ├── gedcom.service.ts    # Orquestador de la lógica
│   │   ├── dto/                 # Validación de carga de archivos
│   │   └── parser/              # El "Cerebro" del sistema
│   │       ├── gedcom-engine.ts # Lector de texto plano a JSON
│   │       ├── relations.ts     # Lógica para casos complejos (Tío/Primo)
│   │       └── layout-helper.ts # Cálculos de coordenadas para el front
│   └── common/                  # Middlewares y utilidades globales
└── test/                        # Pruebas de integración
```

### 2. Frontend: `noxwork-gedcom-web` (React)

```text
noxwork-gedcom-web/
├── src/
│   ├── assets/                  # Branding & Logos Noxwork
│   ├── components/              # UI Atoms (Buttons, Modals, Spinners)
│   ├── features/                # Módulos de funcionalidad
│   │   ├── uploader/            # Drag & Drop y validación de archivos
│   │   └── visualizer/          # Motor de React Flow
│   │       ├── nodes/           # Custom Nodes (Gender colors, Alerts)
│   │       ├── edges/           # Custom Edges (Smart routing lines)
│   │       └── TreeCanvas.tsx   # Lienzo principal del árbol
│   ├── hooks/                   # useGedcomData, useFlowControls
│   ├── store/                   # Estado global con Zustand
│   └── styles/                  # Tailwind config & themes
└── vite.config.ts
```

## Persistencia y Modelado de Datos
- **Motor:** PostgreSQL 16+.
- **ORM:** Prisma.
- **Ventajas Clave:** - Uso de `JSONB` para compatibilidad con extensiones GEDCOM no estándar.
    - Soporte para consultas recursivas (Ancestros/Descendientes).
    - Tipado estricto compartido entre el Backend y la Base de Datos.
- **Estrategia de Carga:** - Implementación de transacciones para cargas masivas de archivos `.ged` para asegurar integridad referencial.
- **Estructura de Datos:** - Modelo Normalizado para Entidades (Personas).
    - Modelo de Aristas (Edges) para Relaciones N a N.
- **Cache (Opcional):** Redis, para cachear el cálculo del layout de árboles muy grandes (>5000 nodos).

## Lógica de Grafos y Relaciones Especiales
1. Manejo de Ciclos: El sistema debe detectar cuando una persona tiene múltiples roles (ej. el caso "Hijo-Tío-Primo") basándose en la conexión de IDs únicos (@INDI@).
2. Nodos de Alerta: Crear un CustomNode que resalte visualmente cuando existan relaciones de consanguinidad o cruces generacionales.
3. Layout Engine: Integrar la lógica de Dagre para que, sin importar la complejidad, los nodos no se encimen y el árbol sea legible.

## Lógica de Negocio y Casos de Borde
El Desafío del "Hijo-Tío-Primo"
### Para manejar relaciones complejas donde una persona ocupa múltiples posiciones en el árbol:
- Identificadores Únicos: Uso estricto de IDs de GEDCOM (@I123@) como llaves primarias en el grafo.
- Multirrol en Metadata: Cada nodo de persona almacenará un array de relaciones para permitir que el frontend resalte múltiples caminos de parentesco.
- Dagre Engine: Implementación de algoritmos de posicionamiento por rangos (jerarquía generacional) para evitar el solapamiento de nodos en casos de consanguinidad.

## Roadmap de Implementación (Fase Inicial)
- [x] Paso 1: Configurar el Backend para recibir un archivo .ged y devolver un JSON plano de individuos.
- [x] Paso 2: Crear la lógica de "Relaciones" en el Backend que identifique padres, hijos y parejas.
- [x] Paso 3: En el Frontend, mapear ese JSON a los objetos nodes y edges que requiere React Flow.
- [x] Paso 4: Aplicar el branding de Noxwork a la interfaz.
- [x] Paso 5: Autenticación completa (Google SSO + Email/Password + recuperación de contraseña + reenvío de confirmación + banner de usuario no confirmado).

## Estrategia de Despliegue (Infraestructura Low-Cost)
- **Frontend Hosting:** Vercel (CI/CD desde GitHub).
- **Backend Hosting:** Railway.app (Node.js Runtime).
- **Database:** Neon.tech (PostgreSQL Serverless).
- **DNS Management:** Configuración de subdominio `gedcom.noxwork.net` apuntando a Vercel.
- **Environment Management:** Uso de variables de entorno (.env) para separar credenciales de DB en Local vs Producción.

## Módulo de Edición y Exportación
- **Modo Editor:** Permitir la creación de nodos `Person` y aristas `Relationship` desde el lienzo de React Flow sin archivo previo. (Implementado con Zustand y sincronización debounced).
- **Sincronización en Tiempo Real:** Actualización optimista en el frontend y persistencia en PostgreSQL vía NestJS (`PATCH /gedcom/node/:id`, `POST /gedcom/relationship`, `DELETE /gedcom/node/:id`).
- **Export Engine:** Servicio en el backend para generar un archivo `.ged` válido (Standard 7.0) a partir de los datos almacenados en PostgreSQL.
- **Interacción:** Implementación de "Quick-add buttons" en los Custom Nodes para agilizar la expansión del árbol manualmente.

---
© 2026 Noxwork Technologies | Engineering Innovation Labs.

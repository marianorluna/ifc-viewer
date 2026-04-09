# ARQFI Viewer

Visor web de modelos **IFC** construido con **That Open Engine** (v3), **Three.js** y **Vite**. La aplicación sigue una arquitectura por capas (dominio, aplicación, infraestructura, presentación) para aislar reglas de negocio del visor concreto.

## Requisitos

- **Node.js** 20 o superior (`engines` en `package.json`)

## Scripts

| Comando             | Descripción                                                         |
| ------------------- | ------------------------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo (Vite)                                       |
| `npm run build`     | Comprobación TypeScript (`tsc -b`) y build de producción en `dist/` |
| `npm run preview`   | Sirve la carpeta `dist/` localmente                                 |
| `npm run typecheck` | TypeScript en modo comprobación (`--noEmit`)                        |
| `npm test`          | Tests unitarios (Node test runner vía `tsx`)                        |

## Puesta en marcha local

```bash
npm ci
npm run dev
```

Abre la URL que indique Vite (por defecto `http://localhost:5173`). Usa **Cargar IFC** para elegir un archivo `.ifc` desde tu equipo.

## Funcionalidades implementadas (fases 1 y 2)

### Visor y modelo

- Inicialización del mundo 3D (escena, cámara, renderer, rejilla) con `@thatopen/components` y `@thatopen/components-front`.
- Carga de IFC desde archivo; identificación de modelo y reconstrucción en escena vía `IfcLoader` y `FragmentsManager`.
- WASM de **web-ifc** cargado desde **unpkg** (versión alineada con el código, p. ej. `0.0.77`).
- Worker de fragmentos obtenido en tiempo de ejecución desde el recurso público de That Open (`thatopen.github.io`); requiere conexión a Internet en el cliente.

### Selección y propiedades

- Selección con **Highlighter** y actualización del panel lateral.
- Propiedades del elemento seleccionado: vista en **tabla** (parseo IFC-friendly) y conmutador a vista **JSON**.
- Enriquecimiento de datos para la tabla: cantidades (`Qto`), materiales, caja envolvente y lectura de **unidades de proyecto** (`IfcProjectUnits`) cuando aplica.

### Navegación BIM (fase 2)

- Clasificación por **niveles espaciales (storeys)** y por **categoría**, con `Classifier` de That Open.
- Por grupo: **Aislar** (con reset vía mostrar todo), **Ocultar** / **Mostrar**, y **Mostrar todo** global (`Hider`).
- Los árboles se refrescan tras cargar un modelo.

### Interfaz y UX

- Tema **claro / oscuro** (escena y rejilla coherentes con el modo).
- Barra lateral redimensionable en escritorio, colapsable y adaptación a vista móvil.
- Panel de **vistas de cámara**: ajustar a modelo, isométrica, planta, frente y lateral.
- Persistencia opcional del estado colapsado del panel de cámara (`sessionStorage`).

## Estructura del código

```
src/
  domain/           # Entidades, puertos (interfaces)
  application/      # Casos de uso, ViewerFacade
  infrastructure/   # ThatOpenViewerAdapter, web-ifc auxiliar
  presentation/     # Renderizado de propiedades (vistas)
```

El punto de entrada de la UI es `src/main.ts`; el adaptador principal del motor está en `src/infrastructure/thatopen/ThatOpenViewerAdapter.ts`.

## Tests y calidad

- Tests bajo `src/**/*.test.ts` (casos de uso, parseo de propiedades, enriquecimiento IFC).
- TypeScript estricto (`strict`, `noImplicitAny`, etc., ver `tsconfig.json`).

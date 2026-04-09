# PROMPTS POR FASES

## FASE 1

Haz la FASE 1 (base sólida).

Objetivo:
Implementar la base del visor 3D con mundo inicializado, carga de modelo, selección de elementos y visualización de propiedades.

Alcance (incluye):

- Inicialización del mundo 3D (scene, camera, renderer, grid/lights básicos)
- Carga de modelo en el visor
- Selección simple de elementos en escena
- Panel de propiedades del elemento seleccionado
- Estructura inicial de arquitectura por capas (domain/application/infrastructure/presentation)

Fuera de alcance (no incluir):

- Árbol espacial
- Filtros avanzados y clasificación
- Secciones/mediciones/clipping
- Colaboración y permisos
- Optimizaciones avanzadas

Restricciones técnicas obligatorias:

- That Open Engine moderno: @thatopen/components, @thatopen/components-front, @thatopen/ui
- No usar openbim-components ni web-ifc-viewer
- TypeScript estricto, sin any
- Clean Architecture (dominio aislado de infraestructura)
- Composición sobre herencia, SOLID

Entregables:

- Bootstrap del viewer y ciclo de vida (init/dispose)
- Caso de uso de carga de modelo
- Caso de uso de selección
- Servicio de propiedades
- UI mínima: canvas + panel de propiedades + acciones básicas
- Tests mínimos de casos de uso críticos

Criterios de cierre (Definition of Done):

- Se puede cargar un modelo y visualizarlo correctamente
- Se puede seleccionar un elemento y ver sus propiedades sin errores
- No hay lógica de dominio en UI/controladores
- Typecheck estricto y build exitosos

Validación requerida:

- Build/lint/typecheck sin errores
- Pruebas mínimas de la fase
- Flujo funcional validado manualmente

Salida esperada:

1. Resumen de lo implementado
2. Qué faltó / riesgos
3. Checklist de verificación ejecutado
4. Siguiente paso recomendado

## FASE 2

Haz la FASE 2 (navegación BIM).

Objetivo:
Agregar navegación BIM con árbol espacial, filtros de visualización, aislamiento de elementos y clasificación básica.

Alcance (incluye):

- Árbol espacial navegable del modelo
- Filtros por criterios básicos (categoría/planta/tipo, según disponibilidad de datos)
- Aislar/ocultar/mostrar elementos
- Clasificación visual inicial (coloreado o agrupación por criterio)
- Integración de estos flujos con casos de uso en capa application

Fuera de alcance (no incluir):

- Secciones y mediciones
- Issues colaborativos
- Permisos/autenticación
- Workers/perfilado avanzado

Restricciones técnicas obligatorias:

- That Open Engine moderno: @thatopen/components, @thatopen/components-front, @thatopen/ui
- No usar openbim-components ni web-ifc-viewer
- TypeScript estricto, sin any
- Clean Architecture (dominio aislado de infraestructura)
- Composición sobre herencia, SOLID

Entregables:

- Módulo de árbol espacial (lectura + navegación)
- Casos de uso de filtros y aislamiento
- Adaptador de clasificación
- UI: panel de árbol + toolbar de filtros/aislamiento
- Tests de casos de uso de navegación/filtros

Criterios de cierre (Definition of Done):

- El árbol espacial permite navegar y seleccionar elementos
- Filtros y aislamiento funcionan sin romper selección/propiedades
- Clasificación visual aplica correctamente al menos un criterio
- Build/typecheck/tests de fase en verde

Validación requerida:

- Build/lint/typecheck sin errores
- Pruebas mínimas de la fase
- Flujo funcional validado manualmente

Salida esperada:

1. Resumen de lo implementado
2. Qué faltó / riesgos
3. Checklist de verificación ejecutado
4. Siguiente paso recomendado

## FASE 3

Haz la FASE 3 (análisis).

Objetivo:
Incorporar herramientas de análisis del modelo: secciones, mediciones, clipping y snapshots de vista.

Alcance (incluye):

- Section planes (crear/activar/desactivar/eliminar)
- Medición (distancia; y área si es viable en esta fase)
- Clipping básico utilizable desde UI
- Snapshot de vista (captura del estado visual)
- Casos de uso y puertos para estas herramientas

Fuera de alcance (no incluir):

- Sistema de issues colaborativo
- Permisos por rol
- Optimización profunda con workers y stress tests

Restricciones técnicas obligatorias:

- That Open Engine moderno: @thatopen/components, @thatopen/components-front, @thatopen/ui
- No usar openbim-components ni web-ifc-viewer
- TypeScript estricto, sin any
- Clean Architecture (dominio aislado de infraestructura)
- Composición sobre herencia, SOLID

Entregables:

- Módulos de secciones/mediciones/clipping
- Casos de uso para acciones de análisis
- Funcionalidad de snapshots
- UI: herramientas de análisis en toolbar/panel
- Tests de casos de uso de análisis principales

Criterios de cierre (Definition of Done):

- Secciones y clipping operan sin inestabilidad visual
- Medición funciona con resultados consistentes
- Snapshot se genera correctamente
- Integración limpia con fases 1 y 2

Validación requerida:

- Build/lint/typecheck sin errores
- Pruebas mínimas de la fase
- Flujo funcional validado manualmente

Salida esperada:

1. Resumen de lo implementado
2. Qué faltó / riesgos
3. Checklist de verificación ejecutado
4. Siguiente paso recomendado

## FASE 4

Haz la FASE 4 (colaboración).

Objetivo:
Agregar capacidades colaborativas: issues, vistas guardadas, deep links compartibles y control de permisos.

Alcance (incluye):

- Creación/listado/actualización básica de issues sobre elementos o vistas
- Guardado y restauración de vistas
- Deep links para abrir estado de visor (modelo/cámara/selección/filtros mínimos)
- Modelo inicial de permisos por rol (al menos lectura vs edición)
- Diseño de puertos para backend (aunque sea mock/local en primera iteración)

Fuera de alcance (no incluir):

- Optimización profunda de rendimiento
- Stress tests masivos
- Refactorizaciones no necesarias para la fase

Restricciones técnicas obligatorias:

- That Open Engine moderno: @thatopen/components, @thatopen/components-front, @thatopen/ui
- No usar openbim-components ni web-ifc-viewer
- TypeScript estricto, sin any
- Clean Architecture (dominio aislado de infraestructura)
- Composición sobre herencia, SOLID

Entregables:

- Módulo de issues (domain + application + infraestructura inicial)
- Módulo de view states persistentes
- Generación e interpretación de deep links
- Módulo de autorización por rol (mínimo viable)
- UI: panel de issues + gestión de vistas + compartir enlace
- Tests de permisos y restauración de estado

Criterios de cierre (Definition of Done):

- Se pueden crear y consultar issues en flujo completo
- Vistas se guardan/restauran sin pérdida de estado clave
- Deep links rehidratan correctamente el visor
- Permisos bloquean acciones no autorizadas

Validación requerida:

- Build/lint/typecheck sin errores
- Pruebas mínimas de la fase
- Flujo funcional validado manualmente

Salida esperada:

1. Resumen de lo implementado
2. Qué faltó / riesgos
3. Checklist de verificación ejecutado
4. Siguiente paso recomendado

# FASE 5

Haz la FASE 5 (optimización).

Objetivo:
Optimizar rendimiento y resiliencia del visor con perfilado, cachés, workers y pruebas de estrés.

Alcance (incluye):

- Perfilado de rendimiento de flujos críticos (carga, selección, propiedades, filtros)
- Estrategia de caché (propiedades, índices, consultas frecuentes)
- Uso de workers para tareas pesadas (parsing/procesamiento)
- Stress tests con modelos grandes y escenarios concurrentes
- Métricas y umbrales de rendimiento documentados

Fuera de alcance (no incluir):

- Nuevas features funcionales mayores
- Cambios de UX no relacionados a performance
- Rediseños arquitectónicos completos salvo necesidad crítica

Restricciones técnicas obligatorias:

- That Open Engine moderno: @thatopen/components, @thatopen/components-front, @thatopen/ui
- No usar openbim-components ni web-ifc-viewer
- TypeScript estricto, sin any
- Clean Architecture (dominio aislado de infraestructura)
- Composición sobre herencia, SOLID

Entregables:

- Reporte de perfilado con hotspots identificados
- Implementación de cachés y estrategia de invalidez
- Integración de workers para tareas seleccionadas
- Suite de stress tests y resultados
- Ajustes finales en cuellos de botella

Criterios de cierre (Definition of Done):

- Mejora medible en tiempos de carga/interacción respecto a baseline
- UI mantiene fluidez aceptable bajo carga objetivo
- Sin regresiones funcionales en fases 1-4
- Métricas de rendimiento reproducibles y documentadas

Validación requerida:

- Build/lint/typecheck sin errores
- Pruebas mínimas de la fase
- Flujo funcional validado manualmente

Salida esperada:

1. Resumen de lo implementado
2. Qué faltó / riesgos
3. Checklist de verificación ejecutado
4. Siguiente paso recomendado

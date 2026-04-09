# Seguimiento de Implementacion por Fases

## Estrategia Git

- Rama principal: `main`
- Rama de fase 1: `phase/1-base-solida`
- Rama de fase 2: `phase/2-navegacion-bim`
- Rama de fase 3: `phase/3-analisis`
- Rama de fase 4: `phase/4-colaboracion`
- Rama de fase 5: `phase/5-optimizacion`

Nota: para crear y mantener varias ramas reales, Git necesita al menos 1 commit base.

## Estado General

- Fase actual: `Fase 2`
- Estado del roadmap: `En progreso`
- Ultima actualizacion: 2026-04-09

---

## Fase 1 - Base solida

### Objetivo
Mundo 3D + carga de modelo + seleccion + propiedades con arquitectura por capas.

### Alcance
- Inicializacion del visor con That Open Engine
- Carga IFC desde archivo
- Seleccion de elementos
- Panel de propiedades del elemento seleccionado
- Estructura por capas (`domain`, `application`, `infrastructure`, `presentation`)

### Entregables implementados
- Bootstrap viewer y ciclo de vida (`init` / `dispose`)
- Casos de uso de carga y limpieza de seleccion
- Servicio de propiedades de seleccion
- UI minima (canvas + panel + acciones)
- Test minimo de caso de uso

### Validacion
- `npm run typecheck`: OK
- `npm run test`: OK
- `npm run build`: OK

### Riesgos observados
- Bundle grande en build de produccion (warning de chunks)
- Vulnerabilidades de dependencias reportadas por `npm audit`

### Cierre de fase
- [x] Cargar modelo IFC
- [x] Seleccionar elemento
- [x] Ver propiedades
- [x] Build y typecheck exitosos

---

## Fase 2 - Navegacion BIM

### Objetivo
Arbol espacial, filtros, aislamiento y clasificacion basica.

### Estado
- [x] Implementada (pendiente validacion manual)

### Entregables implementados
- Extension del puerto `ViewerPort` para navegacion, filtros y aislamiento
- Casos de uso para arbol espacial, categorias, aislar, ocultar y mostrar todo
- Adaptador de clasificacion con `Classifier.byIfcBuildingStorey` y `Classifier.byCategory`
- Adaptador de visibilidad con `Hider` (isolate, hide, showAll)
- UI de panel BIM con arbol de storeys y grupos por categoria
- Acciones en toolbar: `Mostrar todo` + controles por nodo (`Aislar`, `Ocultar`)
- Tests minimos de use-cases de navegacion/filtros

### Checklist de cierre tecnico
- [x] Arbol espacial navegable por storeys
- [x] Filtros por categoria disponibles
- [x] Aislar/ocultar/mostrar todo operativos
- [x] Clasificacion inicial por agrupacion (storeys/categorias)

---

## Fase 3 - Analisis

### Objetivo
Secciones, mediciones, clipping y snapshots.

### Estado
- [ ] No iniciada

### Checklist de inicio
- [ ] Definir puertos/casos de uso de herramientas de analisis
- [ ] Diseñar interacciones UI de herramientas

---

## Fase 4 - Colaboracion

### Objetivo
Issues, vistas guardadas, deep links y permisos.

### Estado
- [ ] No iniciada

### Checklist de inicio
- [ ] Definir modelo de issue y permisos
- [ ] Definir persistencia de view states

---

## Fase 5 - Optimizacion

### Objetivo
Perfilado, caches, workers y stress tests.

### Estado
- [ ] No iniciada

### Checklist de inicio
- [ ] Baseline de rendimiento
- [ ] Plan de instrumentacion y metricas


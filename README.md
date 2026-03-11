# 📚 Control de Asistencia

Aplicación web para el seguimiento de asistencia universitaria. Permite registrar ramos, horarios y asistencia clase a clase, calculando automáticamente porcentajes y proyecciones de aprobación.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

---

## ✨ Características

### Vista Calendario Semanal
- Grilla semanal (Lun–Sáb) con bloques horarios visuales por ramo.
- Línea roja indicando la hora actual en el día de hoy.
- Navegación entre semanas (anterior / siguiente / hoy).
- Click en un bloque para marcar asistencia rápidamente (popup).
- Indicadores visuales de estado: ✓ asistido, ✗ falta, ? sin marcar.
- Clases fuera del semestre o canceladas se muestran atenuadas.

### Vista Lista de Ramos
- Tarjetas por ramo con porcentaje de asistencia, barra de progreso y marca del mínimo requerido.
- Agrupación opcional de ramos (ej: Teoría + Taller del mismo curso) con estado global del grupo.
- Indicador de clases sin marcar.
- Proyección de faltas restantes permitidas.

### Vista Detalle por Ramo
- Historial completo de clases agrupado por mes.
- Botones para marcar asistencia o falta en cada clase.
- Cancelar/reactivar clases individuales.
- Estadísticas: porcentaje actual, asistidas, ausentes, sin marcar.
- Información de cuántas faltas más se pueden permitir.

### Gestión de Ramos
- Crear, editar y eliminar ramos.
- Campos: nombre, tipo (Teoría/Taller/Laboratorio/Otro), % mínimo de asistencia, color y grupo.
- Múltiples bloques horarios por ramo (día + hora inicio/fin).
- Migración automática de llaves de asistencia al cambiar horarios (no se pierde historial).

### Días Libres / Feriados
- Inhabilitar días completos que aplican a todos los ramos.
- Las clases de días inhabilitados no cuentan en el cálculo de asistencia.

### Configuración
- Fechas de inicio y fin de semestre.
- Exportar datos como archivo JSON.
- Importar datos desde archivo JSON.
- Borrar todos los datos con confirmación.

---

## 🧮 Lógica de Cálculos

### Porcentaje de Asistencia
El porcentaje se calcula **solo sobre clases explícitamente marcadas** (asistidas + ausentes), excluyendo las clases pasadas sin marcar:

```
markedPast = attended + absent
pct = attended / markedPast × 100
```

### Faltas Restantes
Se calcula en base a la **asistencia máxima posible desde hoy en adelante**:

```
req = ⌈total × minAtt / 100⌉
canMiss = (attended + actFut) − req
```

Donde `actFut` son las clases activas futuras y `total` es el total de clases activas del semestre.

### Estados
| Estado    | Condición                           | Color     |
|-----------|-------------------------------------|-----------|
| `ok`      | pct ≥ minAtt                        | 🟢 Verde  |
| `warning` | pct ≥ minAtt − 10                   | 🟡 Amarillo |
| `danger`  | pct < minAtt − 10                   | 🔴 Rojo   |
| `unknown` | Sin clases marcadas aún             | ⚪ Gris   |

---

## 🛠️ Stack Técnico

| Componente     | Tecnología                          |
|----------------|-------------------------------------|
| Frontend       | HTML5 + CSS3 + JavaScript vanilla   |
| Persistencia   | `localStorage` (clave `asistencia_v5`) |
| Dependencias   | **Ninguna** — cero librerías externas |
| Arquitectura   | Single Page Application (SPA) en un solo archivo |

---

## 📁 Estructura del Proyecto

```
proyecto/
├── asistencia.html   # Aplicación completa (HTML + CSS + JS)
├── README.md         # Este archivo
├── requirements.txt  # Requisitos del proyecto
└── vercel.json       # Configuración de despliegue en Vercel
```

---

## 🚀 Despliegue

### Local
Simplemente abre `asistencia.html` en cualquier navegador moderno. No requiere servidor.

### Vercel

1. **Instala Vercel CLI** (si no la tienes):
   ```bash
   npm i -g vercel
   ```

2. **Despliega desde la carpeta del proyecto**:
   ```bash
   cd proyecto
   vercel
   ```

3. **O conecta el repositorio desde el dashboard de Vercel**:
   - Ve a [vercel.com](https://vercel.com) → New Project.
   - Importa tu repositorio de GitHub/GitLab/Bitbucket.
   - Vercel detectará la configuración de `vercel.json` automáticamente.

El archivo `vercel.json` incluido configura:
- `asistencia.html` como página principal.
- Headers de seguridad y caché optimizados.
- Limpieza de URLs (clean URLs desactivado para evitar conflictos).

---

## 💾 Datos y Privacidad

- Todos los datos se almacenan **exclusivamente en el navegador** del usuario (`localStorage`).
- **No se envía ningún dato a servidores externos**.
- Los datos persisten entre sesiones del navegador.
- Se pueden exportar/importar como archivo JSON desde Configuración.

---

## 🔄 Migración de Versiones

La aplicación soporta migración automática desde v4 a v5:
- v4 usaba un bloque por día (`subId_YYYY-MM-DD`).
- v5 soporta múltiples bloques por día (`subId_YYYY-MM-DD_HHMM`).
- Al detectar datos v4, se migran automáticamente al formato v5.

---

## 📱 Compatibilidad

- ✅ Chrome / Edge (escritorio y móvil)
- ✅ Firefox
- ✅ Safari (escritorio y móvil)
- ✅ Diseño responsive para pantallas pequeñas

---

## 📄 Licencia

Este proyecto es de uso personal/educativo. Todos los derechos reservados.

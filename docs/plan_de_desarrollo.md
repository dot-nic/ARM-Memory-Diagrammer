# Plan de Desarrollo: App de Diagramación de Memorias ARM

Este documento divide el desarrollo de la aplicación en Sprints iterativos, basados en los casos de uso (CU) y requerimientos (RF/RNF) definidos en la especificación. Se asume una duración estimada de 1 a 2 semanas por Sprint, dependiendo del tamaño del equipo.

## Sprint 1: Fundación del Proyecto y UI Base
**Objetivo:** Establecer la arquitectura base del proyecto y el entorno de trabajo principal.

*   **Configuración Inicial:** Setup del proyecto como Single Page Application estática (HTML, CSS, JS puro o framework ligero). (RNF01)
*   **Gestor del Lienzo:** Implementación del área de trabajo infinita o ajustable, con soporte para paneo (desplazamiento) y zoom. (CU01)
*   **Cuadrícula y Snap:** Dibujo de la grilla de fondo e implementación de ajuste a la cuadrícula (*snap to grid*). (RF01)
*   **Estructura de la Interfaz:** Maquetación básica de la barra lateral (Side Bar) y el lienzo principal. (RF01)

## Sprint 2: Componentes Core y Drag & Drop
**Objetivo:** Permitir al usuario visualizar e interactuar físicamente con los componentes en la pantalla.

*   **Renderizado de Componentes:** Creación de las representaciones visuales base para Memorias y Decodificadores. (RF02)
*   **Drag & Drop (Arrastrar y Soltar):** Lógica para tomar un componente de la barra lateral y soltarlo en el lienzo. (CU02, RNF02)
*   **Sistema de Selección:** Permitir hacer clic en un componente ya posicionado para seleccionarlo o moverlo.
*   **Estructura de Datos Local:** Creación del modelo de datos base en memoria para registrar qué componentes existen y en qué coordenadas.

## Sprint 3: Edición y Reactividad de Componentes
**Objetivo:** Darle vida a los componentes permitiendo su configuración y redimensionamiento dinámico.

*   **Menú de Propiedades:** Implementar el pop-up o panel de edición al hacer clic en un componente. (CU03)
*   **Configuración de Memorias:** Lógica para editar la cantidad de *words* y el ancho del bus, actualizando instantáneamente el texto interior (ej. `1K x 16 bits`). (RF03)
*   **Configuración de Decodificadores:** Edición del tamaño (ej. 3x8), redimensionamiento visual del componente en tiempo real, actualización de pines (entradas/salidas) y del título. (RF03)
*   **Alternancia de Estados Lógicos:** Permitir invertir la lógica de los pines de control (ej. CS, Enable) y renderizar la "burbuja" de activo bajo. (CU07, RF06)

## Sprint 4: Sistema de Conexiones y Buses
**Objetivo:** Permitir la interconexión entre componentes de forma prolija.

*   **Líneas Ortogonales:** Algoritmo para trazar líneas a 90 grados (buses/cables) desde un pin de origen a un destino. (CU05, RF05)
*   **Nodos de Unión:** Capacidad de conectar un cable hacia otro existente, generando un nodo de unión (círculo negro). (CU06, RF05)
*   **Gestión de Rutas:** Asegurar que las líneas se actualicen visualmente o se mantengan conectadas si un componente se mueve.

## Sprint 5: Anotaciones e Interacciones Avanzadas
**Objetivo:** Completar las herramientas de diagramación y mejorar la productividad del usuario.

*   **Etiquetado de Buses:** Herramienta para agregar texto a las conexiones, soportando formato de rangos (ej. `D[0..15]`, `A[10..11]`). (RF05)
*   **Marcadores de Ancho:** Posibilidad de añadir la línea diagonal sobre el bus con el número indicando su ancho en bits. (CU06, RF05)
*   **Duplicación (Copy/Paste):** Lógica para clonar un componente seleccionado junto a sus propiedades exactas usando Ctrl+C/Ctrl+V, manteniendo alta eficiencia en memoria. (CU04, RF04)

## Sprint 6: Persistencia, Exportación y Pulido (Release)
**Objetivo:** Cerrar el ciclo de uso permitiendo guardar el trabajo y asegurar la calidad de la aplicación.

*   **Guardado de Proyecto:** Serializar el estado completo del diagrama a un JSON local y descargarlo vía File API. (CU08, RF07)
*   **Carga de Proyecto:** Parseo del JSON para reconstruir el estado visual y lógico del diagrama desde un archivo. (CU09)
*   **Exportación a Imagen:** Funcionalidad para renderizar el lienzo a una imagen PNG/JPG y descargarla. (CU10)
*   **Optimización y Testing:** Pruebas de estrés (50 componentes, 200 conexiones a >30fps) y validación en navegadores modernos (Chrome, Firefox, Edge, Safari). (RNF03, RNF04)

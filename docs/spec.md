# **App de Diagramación de Memorias ARM**

## **1\. Descripción General**

La aplicación es una herramienta web estática (Single Page Application, sin necesidad de base de datos ni backend) diseñada para crear esquemas de arquitecturas de memoria para procesadores ARM. Permite a los usuarios arrastrar y soltar componentes desde una barra de herramientas lateral, conectarlos mediante buses, configurar su lógica de activación y guardar el progreso localmente.

## **2\. Casos de Uso (CU)**

| ID | Nombre | Descripción | Actor Principal |
| :---- | :---- | :---- | :---- |
| **CU01** | **Gestionar Lienzo** | El usuario puede visualizar un plano cuadriculado, hacer zoom y desplazarse por el área de trabajo. | Usuario |
| **CU02** | **Insertar Componente** | El usuario selecciona un componente desde la barra lateral (Side Bar) y lo coloca en el plano. | Usuario |
| **CU03** | **Configurar Componente** | El usuario selecciona un componente para definir sus parámetros. En memorias: Cantidad de words y ancho de bits. En decodificadores: Tamaño ![][image1] (entradas x salidas). | Usuario |
| **CU04** | **Copiar y Pegar** | El usuario puede duplicar componentes existentes en el lienzo, conservando intactas todas sus configuraciones y propiedades ligeras. | Usuario |
| **CU05** | **Trazar Buses/Cables** | El usuario dibuja líneas ortogonales desde un pin de origen hasta un pin de destino o hacia otro bus existente. | Usuario |
| **CU06** | **Marcar Uniones y Anchos** | El usuario marca un punto de intersección como una "unión" (círculo negro) y añade indicadores de ancho y etiquetas de bus. | Usuario |
| **CU07** | **Invertir Lógica (Activo Bajo/Alto)** | El usuario selecciona un pin de control (ej. CS, Enable, R/W) y alterna la lógica, mostrando/ocultando una burbuja de negación. | Usuario |
| **CU08** | **Guardar Proyecto** | El usuario exporta el estado actual del diagrama a un archivo local (ej. formato .json). | Usuario |
| **CU09** | **Cargar Proyecto** | El usuario sube un archivo previamente guardado para continuar editando el diagrama. | Usuario |
| **CU10** | **Exportar a Imagen** | El usuario exporta el diagrama terminado como un archivo de imagen (PNG/JPG). | Usuario |

## **3\. Requerimientos Funcionales (RF)**

* **RF01 \- Interfaz y Barra Lateral:** La aplicación debe contar con un área de trabajo (lienzo infinito o ajustable con cuadrícula y "snap to grid") y una barra lateral (Side Bar) que actúe como caja de herramientas con los componentes disponibles (Memorias, Decodificadores, Etiquetas, Herramientas de conexión).  
* **RF02 \- Catálogo de Componentes:**  
  * **Memorias:** Bloques con pines predefinidos (ADDRs, DATA, R/W o R'/W, CS).  
  * **Decodificadores:** Bloques con pin de Enable, entradas de selección y múltiples salidas (Q0, Q1, etc.).  
* **RF03 \- Edición Precisa de Propiedades:** Al hacer clic en un componente, debe abrirse un menú o pop-up de edición:  
  * **Memorias:** Permitir ingresar la cantidad de *words* como un string (ej. 16K, 2M) y el ancho del bus de datos como un número entero (ej. 16, 8). El texto central se debe auto-generar con el formato \[Words\] x \[Bits\] bits (ej. 1K x 16 bits).  
  * **Decodificadores:** Permitir seleccionar o ingresar el tamaño de entradas y salidas (![][image1], ej. ![][image2], ![][image3]). El componente debe **adaptarse visualmente en tiempo real**, dibujando exactamente ![][image4] pines de entrada de dirección y ![][image5] pines de salida (![][image6] a ![][image7]), además de actualizar su título superior (ej. "Decodificador ![][image2]").  
* **RF04 \- Duplicación Ligera:** Los componentes deben ser objetos de datos ligeros. La acción de Copiar y Pegar (vía atajos de teclado Ctrl+C/Ctrl+V o menú) debe clonar el componente seleccionado con sus configuraciones (capacidad, tamaño, estados lógicos), generando una nueva instancia independiente en el lienzo sin degradar el rendimiento.  
* **RF05 \- Sistema de Conexión y Buses:**  
  * Permitir el trazado de líneas ortogonales.  
  * **Nomenclatura de Buses:** Las etiquetas de los buses deben soportar rangos mediante corchetes. Específicamente:  
    * **Buses de Datos:** Formato D\[X..Y\] (ej. D\[0..15\]).  
    * **Buses de Direcciones:** Formato A\[X..Y\] (ej. A\[10..11\]).  
  * Debe permitirse colocar un **Marcador de Ancho de Bus** (línea diagonal atravesando el cable con un número, ej. 16, 2).  
  * Debe existir un **Nodo de Unión** (círculo negro relleno) para conexiones y derivaciones en T o cruz.  
* **RF06 \- Lógica de Activación (Burbujas):** Los pines de control (CS, enable) deben poder alternar su estado. La lógica activa en bajo se representa con una "burbuja" (círculo exterior vacío) en el pin correspondiente.  
* **RF07 \- Guardado y Carga Local:** El estado del diagrama debe poder serializarse a un archivo JSON ligero y guardarse localmente mediante la File API del navegador, permitiendo retomar el trabajo exacto posteriormente.

## **4\. Requerimientos No Funcionales (RNF)**

* **RNF01 \- Arquitectura 100% Client-Side:** Aplicación web estática (HTML, CSS, JS puro o framework ligero como React/Vue/Svelte, sin backend ni base de datos).  
* **RNF02 \- Usabilidad y Flujo (Drag & Drop):** Inserción de componentes desde la barra lateral arrastrando y soltando de forma fluida.  
* **RNF03 \- Rendimiento:** Capacidad para manejar al menos 50 componentes y 200 conexiones superpuestas a 30fps como mínimo. La clonación de objetos debe ser eficiente en memoria.  
* **RNF04 \- Compatibilidad:** Soportado en versiones de escritorio modernas de Chrome, Firefox, Edge y Safari.

## **5\. Criterios de Aceptación**

**Historia: Configurar Memorias desde la interfaz**

* **Dado** que el usuario arrastró una Memoria al lienzo desde la barra lateral.  
* **Cuando** hace clic sobre ella, define el parámetro Words como "2K" y el ancho de bus de datos como 8\.  
* **Entonces** el texto interior de la memoria se actualiza instantáneamente a "2K x 8 bits".

**Historia: Redimensionamiento dinámico de Decodificadores**

* **Dado** que el usuario tiene un Decodificador en el lienzo configurado por defecto como ![][image2].  
* **Cuando** el usuario edita sus propiedades y cambia su tamaño a ![][image3].  
* **Entonces** el título del bloque cambia a "Decodificador ![][image3]".  
* **Y** el componente crece visualmente para mostrar 3 pines de entrada en el lado izquierdo y 8 pines de salida (![][image6] hasta ![][image8]) en el lado derecho.

**Historia: Duplicación de componentes (Copy-Paste)**

* **Dado** que el usuario tiene una memoria configurada como "4K x 16 bits" con su pin CS configurado en "Activo Bajo" (con burbuja).  
* **Cuando** el usuario la selecciona y presiona Ctrl+C y luego Ctrl+V.  
* **Entonces** aparece una nueva memoria en el lienzo idéntica: "4K x 16 bits" y con la burbuja en el pin CS, lista para ser movida de forma independiente.

**Historia: Etiquetado de buses de Direcciones y Datos**

* **Dado** que el usuario trazó dos buses independientes en el esquema.  
* **Cuando** utiliza la herramienta de texto/etiqueta en ellos.  
* **Entonces** puede escribir A\[10..11\] en el bus de direcciones de entrada del decodificador, y D\[8..15\] en el bus de datos de salida de la memoria, viéndose reflejado claramente junto a la línea.

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAAZCAYAAABkdu2NAAADX0lEQVR4Xs1XPYsTURSdIYorKn7GaCaZly8IgogSLBRLCxfRYhsL7UWwUlD8AZY2a2EpIrigKf1AsRAsVwSF1WpBQbCyXEGEXc+dmZe57yt5kwnqgbsz79x77jvvzZsJGwQOhDpRFl4NQ786nxoD3iKfwrQm+etTHniUWQus5L9DbsdizELNHGXmmFprE9q4SZhGo6iKnLeZI503DAs6oOLQS+JTpc8+WaFCq9eHtDrGF+3uUNjIdFuUYRmU0JeQqlAb2dv2+/0dgZ5ko8FgsLlWq23LGb24IFxiF9/tdvfjUpHjVqu1K+HCnEvgOCJCiKfQ3AqyHvJEsfwL5K8oQr1JRqBuTg5kie6P7okjn4wze3Y6nZ1kLo7jc7huIN4hHlEuiqK9uH+PWDGEI+QJ6oUJH6PXPcm1223IxbK5ZBPSS7PZPMy9NBqNPczLKmIYZIvFfGcwXpc+jElEHJ9GwRIKL2dNX9NElKtWq9sxfoP4KuuNBhroGIpYPISprYgetB/Q+4JeZ+sTZ15wu2mMlw3U3ZCaZqN5HNzPUROlcZgcnfkshoh12hGZRqMOuO+CnmAB0OKgfUmLQyzoeQ7uJyYfsZgneoyXzzgVNcljfJEWLccG5MGhRSC+wFwkczgq50mM5vcl54V049aEiJ/LJ8BzVjA+qtf3KV5Cw4uspie9RJuRlbmRiW+yMb083+SOIXep1+tt4RoDYXrM8CQ+SQb6661265VS50RqEZpriRfmWKTHcw2v1IBxydNDLMLjEVxPuhZJO/EbTU9Jgr2Tt2liXO8G+QNXIDkcr7PQfUQc5Wlor4I7wLhxIC9D7oWATfsBfhn8bhqj3xzGzxC/ECcwfsCPtAJ6QihaqeNoSA7jO7RA+rpmX7BjXJMiXy4WtyDSd+6QmklAi3yLPg0lY9mt1Eu8yr0QyAtiUY4pT54ponpE90/oQ8Q1I2CeCv0Q63y2SwfpqudS5A6TO4thJWHLm6joiyPQJgfGhOSxnf5eTws/T5Og+/LvqlT6y/zg1c+ryAGm1dvo47EoVEzgApfYxZeBraeN88VIa978fZSYeoJUTVt/BwrAX65V+gtngCkmI8kUsgQTdazAXav+U+6us6BQsRWh0WSanorGaGAQKpJ0mO3ChNoEPjX/Af4AOHSX0iZHhAoAAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC4AAAAZCAYAAABOxhwiAAAC/UlEQVR4XtVVv4sUMRSe4U5QFE6RvUV2N5nZtfUHLGJhYWOriKL+CwpXWAn+E2IhKFco2Np61QmKVygowtkogoWCFtefpev3Msls8ia/7vAEP3hk8t6Xly8vmaQo/gOU3EHwOhXCES8MXbVOJwNlNnPP8c+E5E2UxyLkMzMRSbgwGAyGVVWfl1Ie48HYwDD0IO8xSqEstJ7DPOIAYj9LIX+i3YLNMOBG4Zkld+4kJUGYTqf7pBBPOkW0xpUIPhBCnJu71EJmsE91XfdtvwO9CkdDQlAOKgBzb8J+d4Qb9Hq9Qwi+IqNv40f/l8BALOiCzefo95cPUnVCgqFhP5nqsJPjA+XCnI8w5i40fAsKB0oQ78Me4nvRODFgm6oupLjYsEzEBSa4Dd7z8Xi8xI8RnVEqCHI3OTIA/lXYU+w0Tm5cuNntdkr60Nu0jUmnrdMmWD1w7oC77jgLlWODhNj+FoFCgP9iOBweJ8Fp4YWbB1U8CzFfaNWWOwX6V9ap8rrSG0F1AYxGo0sQfYC+SbDUwudZIvnUFgVFx184XfkPsPdOpZ1B/gx6sS9N3y/cgu2katFWoeKveSwH+jb4CnsDIUd5PALarXtVXd00Dlu4TeyIau5NuQriM1oAMejIYOsGjOpHqSbbxM98De0KbM2OxUDiBC0Y7wh27TsZfPSmzKitq+ojdJzg4xT09bNqzhiwiP5jnLszDrGFq6auatDb40EVXBmPJ0sOqQk5jcbCZDJZpgUYw1E9hfYHtbC+unJ5BWhCvTpu77D6IzaXH9e6ptMh38Ku8MJKXflmB+NgeUu83KcxdguiT9qhFtYDNMNWceFr7eMRAN3jsMvcrwEB1S0cn+tNzw36QHc+04C3xLqWc5CcRxHiN40DH9Hn04iE5uiSup4U5iN2PjYMliudegeV3A3YoQ7DjsV4HMEFs69Azq6769lD/M3JcnOZHWcVN1XKS5PH2hV0ajMD20fH4+smEGPHYqloADmDfByfr4Ev4vMZxGL+qPL5Agx/AKBOlkzxKqNGAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC4AAAAZCAYAAABOxhwiAAADS0lEQVR4Xr1WO4sUQRCe4RAUBUFdl9vH9MyeGgk+VgUDExGMRFF8wAWCmXCBXKC/wEgEMVMwMDC4xMgFQYODC+7wRDkwEGGDMzi4aEFQMBD9qqfnurt6pudx4AfFzH71VXV19WM2CGoh5IQFv9eHBpF1Q+rqLXiCPS4P6kYV6E26QCLh+lwmH1V1ldAwGQuzftZMGXa73f1CiOmZmZmDkuCKKmgUpBHH8c5+v380SeIzrVZrD/c7QMGfYKuwF7B12BzoKa5rDv+MpDcMpjDuJopfiONkAe8/2u32bq7dQhRFlyCa0EwzDr//wt7bgRUGb4jBYLAX461wHtxGkiTHOC+Bwi9A8Bt2NuNU4Ytly0UTGw6HO+hddc1AKJeezGY5wiDCFhWRWFc/txBF4jvqG2rGRtjr9Q6p1wDvu4SIqPDHtswFiroH3RvqGPd1u50eTZ5WlPs40NU2tGNM4E5gbFFwX7IzlzdlC9gy5zDYNyQT3CeRxafPENr7GOCdFqQAtwS7xnkLuhbK84RWGs34gEYcoZ2A94uG2gW6vA+iy+j0LALe4nk+sNJqrQ3lCIOQiqfO43aiTi85QYU5NBD3FfaHJkBGE+CaQtCepa1CnaSCuL8IqvN0O310O12aJkTjblKX1cRfU+HOyrMz5JAyiB3YMiQYGfoxbLmDbwL3p/nzJ4CYEzicmwYlJ6I67541SgPHdKfTOWDy4H5GadC8Zs1B3QKgXUOHruM5BxvZXt2dvPqhfwpbNbm0tmgS5d1u6mu5BucoTvS1Be4XFY5CHph6DXtkWk6htwft9zna71rlTtQEuvsSMYtcBe4V8U7hgDzNOJyHM+Kk3OOy28+zO1pJ9auCKngFy3yV+6h42CjvqqRUZja6jqHdoKvYoKkBY31VM6iv1gSzfobnPGwZS/SIJdEwRqR7HHaF0RlC+O6iMTfSX7aTA9fwaUF/NyLxUB30z4g/znUaSIhLvk8FwG6LCh+MPJTU5SBPj+JPoYZbKHqW3rnfg7xdmTdEHve/kI3Nnm5JLmNCesMy1TZRJXmqqaAslZgCd2al4duHb4iGvszlkdREjW98ZaEHMocvkc9XgLohWl8QWUBvwecvnWADFKcr9tioqtP4ByLil2nVOMoaAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAaCAYAAACD+r1hAAABY0lEQVR4Xo1QsUrFQBDM4ynaKSiKSe42l6QXib2tKd77Av/Dr/Ab7LSx1NofEEFQrASLBxaCYC0Y5/Ky8W7vEAeSy87OzO4lSVxMxpcAc7HeiInjdwxcu14vR4bK2iI0OExsu+V3LEpCpo0QO8siZglIWQeMnF5V1Q6OKZNFUWz+cr42UUodEtELaXo0xhDER6gXmugD5yeedjRUZbkB4TVpPcPZoXkH4YXtZVm2hfoez9O4EpothC3IKzzfSD/mMK11Ce6NSA8GBgqbAuNrnquMyVypOfgOxvPAgElfMNxgwvrQW4H4kqe6Wp7QadKnzKE2CFngfMaP2MWUk7qu13pTT2ClNE23OQjCs2GdWX95TQd9lE0D2ZDd0/nbxhT7CHmH8BbGB+Z5pWnTNKsjOcDgPjDs2XvJnvcTlt8Dw5f0IOt/Q6SFOQ4Tk3lfnptrb0KYH+cc/NmONb2pMQHDW0oYfgBj7joLsEuGVQAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAaCAYAAAC6nQw6AAACAklEQVR4Xq1Vv0vDQBROaIWCgkWsxTa5H8nkJLQ6CCquXV39F5xc3MTFv0TEpeAkDjp01D+goyAiCIpuCuqg37vLJZdrk3bwwcvd+973ft2lqed7EJ+eapeJwkbhEVtJKegX+C2xqLl11NL74nxjJtG2C9qIs5vchSXmnHKYC6RS7HF9PiVOobK4MrESFJyCK5pBz2mL59xCiHpq6AkqCrNYZMdxvIRtJUMt4ZzvQt+gV0EYLGDd54w/Yv0mLIqi+TAM1rF/gr5DX8Mw3FLBplAUx/MI6jPGDkH4ZZwPsT/qdLozSYFf6Cnn7IL4QRC0YT/AHjQajTnTjIckPSHlNpwD6DOSRMaHpAc6EdvXiE/drzDqnvFLjFoz3FRAeGOM3zSbzVmDIaAP/cQY6xZvj5JLIY4NlgqNiQo0womNw76HDlut1mICVWGfQ7+gG2Pul4IYjdDLEDXGDzo6U4bicAkOHfgtXUC73Q4SqhbGWQRnbix4q0jygTPrEpO4yYX8YN2UUnBzASbAw7w7HCQL9IQUdVPZYFLKVRzBC/BrJLvD2a0ph+pIt1XBmrxk2by561W/M59eyhqKLqOQc2POWf2LlOUz9fSXRTPL+IWfoBROEo3SElbekVmTauc+UQqwjRIxiU1Pabdu7cwsSu1n/1RmzZwGLAou81ii2nOZac/TyR9BOVHilKf8bgAAAABJRU5ErkJggg==>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAYAAADE6YVjAAACsElEQVR4XpVVv2sUQRTeQQKKQRFzt8jdzuz9sLPQ23Q2NiltbBT0TxAtRG0s0qQQrAQRRJFD0gliYSEcEmyEpEgTsBALRbCwSGdjcX7f7M3uzNu5XPLB42a+9/u93b0kOSSUJIgoOQdKHc3eoeHTIA6F0OugW0AtKlqxrRmKYrTU6/VSY8w5q6uM/Nu8cAEfM1IKgb9A/hqjf0J+5b18W2t9WVoeGXmeXzSaQc2e41wJg8EgA/8Nsq+NueT0zsaJfw9AIutmq3D+gyDfkSyXNgR0G5Ap5KnPxwbTSEIg7meMZYqR3KrIaj/lL4LfnCXZgd2Zyi4W0lLK16hEW2e91Wq1lms+BAJf1SzEmB9G+w9DM4lglK1Qa/MbQfq1ifI6KcExVZ0Yv5N5qP0Vgr+G4yRN05MuvqyRHcJmi0lo76kWw3N+KefoN5Jl2QXY7DMJ9nfD8eeHw1NIehf8i7SNImNorZRJYPiwihmpEYHXsQcm2O50OmfJ9fv90/D9AO46rsd4JkedLdCPA+UGlrnp6GFZ3R07vqR88/lggHvgu8Jvk+I4nN/aicwQrBTOBZRfe/iEQFCw/oj7fciToiiWGBzynGfPLeHTiC7G5U2x2zGKwRO6ssy0ciD8jEw5V8gjyDU4HEeQVzi/g/yTCQjwXhI70jE5+xrIDA4MDLnCypkIssNf6rrd7gm0eI82LgB0k0gS7qiysXBnJTJ7T90nPFkDOL7H+bZvY8r3ZpK223Z3M/vgk3MAVMKlY1wTwzFqO8o9fCTbpbYEOl7DB3WXu+QdNrvYyVodJUC4JXtUtv11mwSCblblmLkn6J6hmDf4HcH+cTFq7i4KOToZPAZpU94lK1C99zJjw5FTkFwDtQFPC80lpIO8B3BK14DgQ9/gfyKEpxDlixCRCLLLiMlc/AfUKozjQqFEEAAAAABJRU5ErkJggg==>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAaCAYAAADxNd/XAAADY0lEQVR4Xs1Xv2sUQRTeIyqKIqJezuTuZnbNiSSVcKIgKUURVCSIIomNlSg2NqKVTSobSbTXwkbSCiJBRP+GEPAHooiFFiKYRonn93Zn9mZn3szenQf64buZ+96Pee/Nu90YRYRK+pmv2aLJ/xnBHIPKAvwF98p1EdYaKBiGvEK6ATG8kNbocIjjeIeUcgzbEccw4PfPgaTvQ35AvgghPmJdhyzsa7W250aqgH7r6Ne+HEbERqOxBYnekVIs1uv1XZrHTRwH/00K8Ro2ra7HkBKymtGN2Ud0JLkH8hKJrkWMJ25iTkjZgc0zW9cTvElquAzPMUBSj6WQHSR5N/J41Wq1rShuGdKxdQTWyYE//b8CJQX5bI+HDRT6kGyxbs6YUCKVEq3+sLgSxsHExMSoKuBe5PMAW61Wt8HmRV4Ab5khpBs2ms3maST1C+MzHepakiQ12L2jUfPZ2OC6PCjYMMZcL9Pe1ueAN7p+O70pIT/Z6hzsKSZKDTQqaNixOE4O5ERBqz70WNBsm3obWffFKhVAP3RvGl5FFNYZQC4xznmvzjpl67uoZP/Q0UfeAtSh0F9Wv5NVvB8ajoGdXY/J5p00vrbb7Y1IvI2z1pwCuLgwukG3QLdB39XLbB5d369tJL3EIOAO0XcuTq/oxddbQAFGJJn9qfAcDhexLipuRkjxAOtX3NJkbqz8wF+FTOLltoTCJNHwPwfuJ1lhHYN84JPwPywIXAEhe3I4CYfvkN+QFcgtyFvFXVJmlampqU20occoFZgkMWqTb3R4cPOI9VTtJ1UB0+SL/RHszxZE5nuyGdFJcgWUgmYPj9SDcLyCBM/A+RolQyNFenCHIRdor0eXDqYklZ6KekLF03f86GdR3Mr4+PhusmYL6Iq3gGDnNVyjSoTDZxFkHUHm0OYZ7F+BS0wrcNeJT/dC7FUdP2oUM48G7DR9srPCIyTzAmT4BoJBZJp0RwuSuhkVXTaAX4IsKPsTVAA9paQaHyQyDb/zppN7psv0PUJuiAyNZqNFVxyl/6FxUauN0ssvdU/Qdeq81tFIqu4XwrNnsSSBuymXYaCM0sV1MGmt5UxdzxDC1mEtg9K2cVwKj8JDBxTlGNSV63avKG2MBnebIfvBEIrI61iWJQleRZ8YVhwWnuAcbXF/AJ6FsFXqQDqdAAAAAElFTkSuQmCC>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAYAAADE6YVjAAACjElEQVR4Xp1UPYjUQBROigPlRBHdDett5s0kZ6egm+tsbC0UEYsD7bUQG1EbCxsLwUoQQZSrrMXCQjjk0ELw2gMLEbxDsLjCzsZi/d5kJpmZzO1e/MIjM+/ve/PmJUnSQeosnbXe+9taxY+v6YWQIw52stIDYfKZ4Z6xPtVM/wbGq5pMFpRSGRGN5ka6drMOGxkiJRKfhaA/QogdkPyUUn4RJM6Fjh3MzpskSHRGEO0g8ZZWOO0uyzIH2TfIbxJ01gvcL8Z5voLqd5HkO8ik1buFwfYIMoU8DW0hoq1C3o8gmeIU10ObBZJfwymYZBN+Rzs0zTZCwDAVbgwGg0OhTQNxSHzR+G0TD4Nj894x6AqJfiFJEdpccJsMySbhJH5Ov0Fp8B2kCFhD4HqWZYv2rkPwCfmkTIJi1pKoW0TFON4Gv+S9dvNL0i8MxiniyQKJVHKVfcbj8Wnsn4H0qpTqMiZzhHsd4X4POBnaCuF4f486NBD4UDABvpelE0vHWIe4CzwspoVaRF1Id8SpHs3XiTnD8snlwyC9nQ2zRdZUVbWgEwhxz/owQHiDnAHACR9P4Ks3adA8BFdw/qrwC4HgisR77O+iqidMwMkhz3ntxmmY/hZFcaQsi2HUbNfcCiR+AXkAucJ9xfsV5A3kb5TAAfxvhjoPlo0TKynPc+VMJHhU8WYPXPJBrO90LhXI8/wSbD9C/Vw4I/sBSUol1Vusb7k+dadS+/1sO9o4wn8NfzMIXKd2crbwk+z0vG6reAf7J8+wJ5e5RLvmsTX/qilOs+K6WgyzoS1mQyts8jZND7B3vwiDWFDPZFHXqLJB19qevl7Famgs2misodP/IkbowfA2m3mwBZpdu9pH7D8ew4GIT5yRWgAAAABJRU5ErkJggg==>
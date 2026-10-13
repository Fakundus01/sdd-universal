# graph/ · El grafo de contexto

Que los `.md` que describen una parte del repo (los que lee un humano o el Cerebro en Obsidian) no se
desfasen del código que describen. No es el grafo de links de Obsidian (eso son links markdown
normales entre `.md`, que Obsidian dibuja solo); esto es un chequeo de frescura: ¿el código de
`rutas` cambió desde la última vez que alguien miró este nodo y escribió qué cambió?

## Instalar en un proyecto

Si lo bajaste con el arnés (`harness/`) desde el combinador del SDD Universal, ya está: `graph/`
viene con `_meta/sync_graph.py` y este README, y el pre-commit de `harness/git-hooks/` ya lo invoca.
A mano: copiá esta carpeta a la raíz del repo y sumale al pre-commit, después de `verify.py --quick`:

```sh
"$PY" "$ROOT/graph/_meta/sync_graph.py" --check --root "$ROOT" || exit 1
```

No hace falta ningún nodo para empezar — `--check` con `graph/` vacía (o sin `graph/`) no falla.
Los nodos se van sumando a medida que el proyecto crece: cuando una carpeta de código queda lo
bastante hecha como para merecer su propia explicación, se le arma un nodo (debajo).

## Un nodo

Cualquier `.md` en esta carpeta (menos `_meta/`, que es el script):

```markdown
---
id: cerebro
rutas: [cerebro/**]
hash:
---

# cerebro

Prosa libre: qué hace esta parte del repo, decisiones, por qué. Esto es lo que lee un humano o el
Cerebro; `sync_graph.py` nunca la toca.
```

`rutas` son rutas relativas a la raíz del repo, entre corchetes. `carpeta/**` recorre la carpeta
entera; sin `**`, un archivo puntual o una carpeta completa. `hash` lo escribe `sync_graph.py`, nunca
a mano.

## Comandos (`_meta/sync_graph.py`, sin dependencias)

| Comando | Qué hace |
|---|---|
| `python graph/_meta/sync_graph.py --check` | Falla (exit 1) si algún nodo quedó desactualizado. Lo corre el pre-commit |
| `python graph/_meta/sync_graph.py --update` | Muestra qué nodos cambiarían, sin escribir nada |
| `python graph/_meta/sync_graph.py --update --accept` | Escribe el hash nuevo — después de revisar (o escribir) la prosa afectada |

## Flujo

1. El código bajo las `rutas` de un nodo cambia.
2. `--check` lo marca desactualizado (en el pre-commit, o a mano).
3. Alguien (humano o agente) lee el diff, actualiza la prosa del nodo si corresponde (si el cambio no
   amerita tocar la prosa, igual hay que aceptar: el hash es sobre el código, no sobre si alguien
   "tenía que" escribir algo).
4. `--update --accept` pisa el hash. El nodo vuelve a estar al día.

## Por qué aparte de `harness/verify.py`

No todo proyecto lo necesita. Vive separado, con su propio exit code: el pre-commit lo invoca como
un paso extra después de `verify.py --quick`, y un proyecto sin `graph/_meta/sync_graph.py` no nota
la diferencia (el hook lo salta si el archivo no existe).

## Tests

Viven en el repo del SDD Universal: el ZIP del proyecto no trae `_meta/tests/`. Si copiaste la
carpeta entera:

```
python -m unittest discover -s graph/_meta/tests
```

# Handback L-3 — Espejos en inglés al día con el canónico 0.35

- **Estado:** done
- **Rama / commit:** `v0.35-L-3` @ `__HASH__` (base `4e09c8d`; el hash del commit final figura en `git log -1` de la rama)
- **Quién:** implementer (MEDIO)

## Hecho
- `SDD-MASTER-EN.md` pasó de 0.30 a 0.35: encabezado, R12, R17, R18, R28, R29 (sumas de 0.31–0.34), §5 (`.gitattributes`, `loops.md`, `loops/<name>.md`, `depende_de`, `skills/`, opcionales enterprise), §7 (aclaración del loop con humano vs R33) y §11 (intro con `historial-master.md` como referencia + tabla 0.35 a 0.32 traducida).
- `SDD-COMPACT-EN.md`: versión 0.35 y la línea del arnés con `depende_de=graph` y `sdd/loops/<name>.md`.
- R33 ya estaba en el espejo; quedó verificada contra el canónico.

## No hecho / pendiente
- Nada de la tarjeta. `historial-master.md` no se tradujo (por criterio 3).

## Cómo
- Traducción del canónico ACTUAL, manteniendo el estilo del EN (voseo a inglés neutro, términos `toggleable/can be turned off`, `fixed`). «AF» se mantiene como «BA» del EN existente.
- Script de comparación de un solo uso, en directorio temporal (no en el repo), pegado abajo.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| `SDD-MASTER-EN.md` | actualización a 0.35 (ver Hecho) |
| `SDD-COMPACT-EN.md` | versión 0.35 + línea del arnés |
| `sdd/progress/v0.35-L-3/handback_L-3.md` | este handback |

## Evidencia
| Criterio de aceptación | Lo demuestra |
|---|---|
| 1. Encabezados 0.35 | checks `version master` y `version compact` |
| 2. R01–R33 mismo default/tipo y tokens de archivo | checks `Rxx default/tipo` y `Rxx tokens de archivo` (33 reglas) |
| 3. §2, §5, §10, §11 | checks `filas §2`, `arbol §5`, `checks §10`, `filas §11`, `referencia historial-master.md` |
| 4. Script de un solo uso | abajo; resultado `RESULT: IGUAL` |

Rojo antes (R29), medido contra la base (copia de `git archive HEAD` de los 4 archivos):
```text
$ git rev-parse --short HEAD
4e09c8d
$ python cmp_l3.py <base>   # solo las líneas FAIL (recortadas a 200 col.)
FAIL version master
     ES=0.35
     EN=0.30
FAIL R12 tokens de archivo
     ES=['playbooks/ia-en-el-producto.md', 'seguridad.md']
     EN=[]
FAIL R17 tokens de archivo
     ES=['.env', '.env.*', '.env.example', '.gitignore', 'security.md']
     EN=['.env', '.env.*', '.env.example', '.gitignore']
FAIL R18 tokens de archivo
     ES=['prompts/sdd-lite.md', 'sdd-lite.md']
     EN=['sdd-lite.md']
FAIL filas §11
     ES=6
     EN=-1
FAIL arbol §5
     ES=['repo/', 'AGENTS.md', '.gitattributes', 'CLAUDE.md', 'harness.config.json', 'harness/', 'README.md', 'src/', 'sdd/', 'SDD-MASTER.md', 'SDD-COMPACT.md', 'GUIDE.md', 'custom.md', 'scenarios.md'
     EN=['repo/', 'AGENTS.md', 'CLAUDE.md', 'harness.config.json', 'harness/', 'README.md', 'src/', 'sdd/', 'SDD-MASTER.md', 'SDD-COMPACT.md', 'GUIDE.md', 'custom.md', 'scenarios.md', 'teams.md', 'mod
FAIL referencia historial-master.md
     ES=True
     EN=False
FAIL version compact
     ES=0.35
     EN=0.30
RESULT: DIFERENTE (8 fallas)
```

Verde después:
```text
$ python cmp_l3.py .     # solo las últimas líneas
(líneas OK: 77, FAIL: 0)
RESULT: IGUAL
```

`python harness/verify.py --changed` (con y sin mis cambios, igual):
```text
verify.py --changed @ 4e09c8d (rama v0.35-L-3)
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)

ROJO — 1 FAIL, 0 WARN
```
Es preexistente: el repo del paquete no tiene `harness.config.json` en la raíz. No lo creé (fuera de zona).

`git diff --stat` (antes del commit):
```text
 SDD-COMPACT-EN.md |  4 ++--
 SDD-MASTER-EN.md  | 37 +++++++++++++++++++++++++------------
 2 files changed, 27 insertions(+), 14 deletions(-)
```

### Script de comparación (un solo uso, fuera del repo)
```python
import re, sys
sys.stdout.reconfigure(encoding="utf-8")
LANG={"<usuario>":"<user>","<rama>":"<branch>","<nombre>":"<name>","<tema>":"<topic>","SDD-COMPACT-EN.md":"SDD-COMPACT.md"}
def nl(x):
    for a,b in LANG.items(): x=x.replace(a,b)
    return x
R = sys.argv[1]
def rd(p): return open(f"{R}/{p}", encoding="utf-8").read()
fails = []
def chk(name, a, b):
    ok = a == b
    print(("OK   " if ok else "FAIL ") + name + ("" if ok else f"\n     ES={a}\n     EN={b}"))
    if not ok: fails.append(name)

def section(t, n):
    m = re.search(rf"^## §{n} ·.*?$(.*?)(?=^## §|\Z)", t, re.S | re.M)
    return m.group(1) if m else ""
def norm_type(s):
    s = s.lower()
    if "fija" in s or "fixed" in s: return "fixed"
    return "toggle"
def rules(t):
    out = {}
    blocks = re.split(r"(?m)^(?=\*\*R\d\d ·)", section(t, 4))
    for b in blocks:
        m = re.match(r"\*\*(R\d\d) · .*? — \[(\w+)[^\]]*\] — ([^*]*)\*\*", b)
        if m:
            toks = sorted(set(nl(x) for x in re.findall(r"`([^`]+)`", b) if re.search(r"[./_]|^R\d\d", x) and not re.search(r"\s|\(\)", x)))
            out[m.group(1)] = (m.group(2), norm_type(m.group(3)), toks)
    return out
def rows(t, n): return sum(1 for l in section(t, n).splitlines() if l.startswith("|") and not re.match(r"\|[-| ]+\|$", l)) - 1
def tree(t):
    s = section(t, 5); m = re.search(r"```\n(.*?)```", s, re.S)
    return [nl(re.sub(r"^[│├└─\s]+", "", l).split()[0]) for l in m.group(1).splitlines() if re.sub(r"^[│├└─\s]+", "", l).strip()]

for mi, ci in (("SDD-MASTER.md", "SDD-MASTER-EN.md"),):
    es, en = rd(mi), rd(ci)
    chk("version master", re.search(r"(\d+\.\d+)", es.split("\n")[2]).group(1), re.search(r"(\d+\.\d+)", en.split("\n")[2]).group(1))
    re_, rn = rules(es), rules(en)
    chk("IDs reglas", sorted(re_), sorted(rn))
    for k in sorted(re_):
        if k in rn:
            chk(f"{k} default/tipo", re_[k][:2], rn[k][:2])
            chk(f"{k} tokens de archivo", re_[k][2], rn[k][2])
    chk("filas §2", rows(es, 2), rows(en, 2))
    chk("filas §11", rows(es, 11), rows(en, 11))
    chk("arbol §5", tree(es), tree(en))
    chk("checks §10", section(es, 10).count("- [ ]"), section(en, 10).count("- [ ]"))
    chk("referencia historial-master.md", "historial-master.md" in es, "historial-master.md" in en)
es, en = rd("SDD-COMPACT.md"), rd("SDD-COMPACT-EN.md")
chk("version compact", re.search(r"v(\d+\.\d+)", es).group(1), re.search(r"v(\d+\.\d+)", en).group(1))
ids = lambda t: re.findall(r"(?m)^(R\d\d) ", t)
chk("IDs compact", sorted(ids(es)), sorted(ids(en)))
chk("lineas compact", len(es.splitlines()), len(en.splitlines()))
fl = lambda t: sorted(set(nl(x) for x in re.findall(r"[\w./<>-]+\.(?:md|json|py)\b|sdd/[\w/<>{},-]+", t)))
chk("archivos citados compact", fl(es), fl(en))
print("RESULT:", "IGUAL" if not fails else f"DIFERENTE ({len(fails)} fallas)")
sys.exit(1 if fails else 0)
```

## Fuera de zona / riesgos
- `harness/verify.py --changed` da rojo por falta de `harness.config.json` en la raíz del paquete (preexistente).
- El script compara estructura (IDs, default/tipo, tokens de archivo por regla, filas, árbol), no la fidelidad semántica de cada frase: eso queda para el reviewer.

## Cambios de spec sugeridos
- ninguno

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- Review independiente de L-3 (re-ejecutar el script sobre la rama).

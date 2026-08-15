# loop-prompt.md · Loop de trabajo + HANDBACK

## Instrucción permanente (pegar una sola vez por sesión)

```
Trabajá por ciclos. Al terminar cada ciclo emití el bloque HANDBACK
y esperá: "OK" (ejecutás el próximo paso propuesto), una edición del
próximo paso, o "STOP".
```

## Formato HANDBACK (máx. ~20 líneas — lo emite el agente)

```
=== HANDBACK · ciclo N · vX.Y.Z ===
Hecho: [qué se implementó, archivos clave]
Tests: [X pasan / Y fallan — o "pendiente"]
MDs: [cuáles se actualizaron]
Git: [commit hecho con tu OK / esperando OK / R01=OFF: commiteado]
Próximo paso propuesto: [1–3 líneas concretas]
Riesgos/dudas: [si hay]
Respondé: OK / editá el próximo paso / STOP
```

Con el "OK", el próximo paso propuesto se convierte en la nueva prompt y el ciclo arranca de nuevo desde R02 (git log). La persona no redacta prompts: solo aprueba, edita o frena.

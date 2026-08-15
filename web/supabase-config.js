// Configuración de Supabase · seguí playbooks/supabase-auth.md
//
// Estos DOS valores son públicos a propósito y por eso viven en el repo:
// lo que protege los datos son las políticas RLS de supabase/schema.sql,
// no esconder la clave. La clave `service_role` NUNCA va acá.
//
// `url` es la base del proyecto, SIN /rest/v1 ni /auth/v1: el código le
// agrega el camino que corresponda en cada llamada.

const SUPABASE = {
  url: "https://nybylxotqxxtfubzwyss.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55YnlseG90cXh4dGZ1Ynp3eXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MDc1OTcsImV4cCI6MjEwMjM4MzU5N30.7Olh6iEQWVK5--p6n-THbE0g18q0T7ynLB2EIDDTxpA"
};

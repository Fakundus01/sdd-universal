// Configuración de Supabase · seguí playbooks/supabase-auth.md
//
// Pegá acá los DOS valores públicos de Project Settings → API.
// Mientras estén vacíos, el sitio funciona igual: no aparece el botón de
// sesión y todo se guarda en el navegador (localStorage).
//
// La clave `anon` es pública a propósito y va al repo: lo que protege los
// datos son las políticas RLS de supabase/schema.sql, no esconderla.
// La clave `service_role` NUNCA va acá ni en ningún archivo del front.

const SUPABASE = {
  url: "",   // https://xxxxxxxx.supabase.co
  key: ""    // eyJ...  (anon public)
};

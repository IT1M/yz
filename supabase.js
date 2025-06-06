
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://qovspvegmjvslzizibxr.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function addNote(title, content) {
  const { data, error } = await supabase
    .from('notes')
    .insert([{ title, content }])
  console.log('Added:', data, 'Error:', error)
}

// جلب كل الملاحظات
async function getNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
  console.log('Notes:', data, 'Error:', error)
}
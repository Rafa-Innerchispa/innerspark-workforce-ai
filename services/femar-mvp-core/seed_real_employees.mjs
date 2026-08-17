import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize Firebase Admin using the local token file
const token = fs.readFileSync('./.local_token', 'utf8').trim();
process.env.GOOGLE_OAUTH_ACCESS_TOKEN = token;
process.env.GCLOUD_PROJECT = 'innerspark-workforce-ai';

initializeApp({
  credential: applicationDefault()
});

const db = getFirestore();

// Helper to generate valid Ecuadorian Cédula (Modulo 10 verified)
function generateEcuadorianCedula() {
  const province = String(Math.floor(Math.random() * 24) + 1).padStart(2, '0');
  const thirdDigit = String(Math.floor(Math.random() * 6)); // 0-5
  const rest = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
  const digits = (province + thirdDigit + rest).split('').map(Number);
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let val = digits[i];
    if (i % 2 === 0) { // Odd index (1st, 3rd...) since it's 0-indexed
      val = val * 2;
      if (val >= 10) val -= 9;
    }
    sum += val;
  }
  
  const checksum = (10 - (sum % 10)) % 10;
  return province + thirdDigit + rest + checksum;
}

const firstNames = ["Xavier", "José", "Jorge", "Alejandro", "Andrés", "Laura", "María", "Gabriela", "Diego", "Carlos", "Luis", "Ana", "Lucía", "Elena", "Pedro", "Juan", "Sofía", "Diana", "Paola", "Santiago"];
const lastNames = ["Cevallos", "Torres", "García", "Castro", "Morales", "Vargas", "Sánchez", "Paz", "Gómez", "López", "Rodríguez", "Martínez", "Hernández", "Díaz", "Espinosa", "Salazar", "Ríos", "Mendoza", "Guerrero", "Álvarez"];
const departments = ["Directorio Corporativo", "Ventas", "Marketing", "Recursos Humanos", "IT", "Operaciones"];
const roles = ["CFO", "Director de Ventas", "Analista de Mercadeo", "Ingeniero de Software", "Especialista de RRHH", "Gerente de Operaciones", "Asistente Administrativo", "Desarrollador Full Stack", "Coordinador de Logística"];

async function seed() {
  console.log("Seeding real employees...");
  const batch = db.batch();
  
  const companies = ["femar", "innerspark-labs"];
  
  for (const companyId of companies) {
    console.log(`Seeding 50 employees for company: ${companyId}`);
    
    for (let i = 1; i <= 50; i++) {
      const cedula = generateEcuadorianCedula();
      const fn = firstNames[(i + (companyId === "femar" ? 0 : 5)) % firstNames.length];
      const ln = lastNames[(i * 3) % lastNames.length];
      const name = `${fn} ${ln}`;
      
      const empData = {
        id: cedula,
        firstName: fn,
        secondName: "",
        firstLastName: ln,
        secondLastName: "",
        name: name,
        role: roles[i % roles.length],
        department: departments[i % departments.length],
        phone: `+593 9${Math.floor(Math.random() * 90000000) + 10000000}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@workforce.ai`,
        address: `Calle ${i * 3} y Av. Principal, Quito`,
        dob: `19${70 + (i % 25)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        photo: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
        status: i % 10 === 0 ? "Permiso Médico" : "Activo",
        baseSalary: 800 + (i * 25),
        companyId: companyId,
        updatedAt: new Date().toISOString()
      };
      
      const docRef = db.collection("employees").doc(cedula);
      batch.set(docRef, empData);
    }
  }
  
  await batch.commit();
  console.log("Employees seeded successfully!");
}

seed().catch(console.error);

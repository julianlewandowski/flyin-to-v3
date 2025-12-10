/**
 * Script to convert Kaggle airports CSV to TypeScript airports.ts file
 * 
 * Usage:
 *   1. Download the CSV from Kaggle: https://www.kaggle.com/datasets/thoudamyoihenba/airports
 *   2. Place it in frontend/data/airports.csv
 *   3. Run: node scripts/convert-airports-csv.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const csvPath = path.join(__dirname, '../data/airports.csv');
const outputPath = path.join(__dirname, '../lib/airports.ts');

// Read CSV file
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  const airports = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Handle CSV parsing with quoted fields that may contain commas
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add last value
    
    // Map values to object (case-insensitive lookup)
    const airport = {};
    headers.forEach((header, index) => {
      let value = values[index] || '';
      // Remove surrounding quotes if present
      value = value.replace(/^"|"$/g, '');
      // Store with original header name and also lowercase for lookup
      airport[header] = value;
      airport[header.toLowerCase()] = value;
    });
    
    // Try to find IATA code in various possible column names (case-insensitive)
    const iataCode = airport.IATA || airport.iata || airport.iata_code || 
                     airport.iataCode || airport.code || '';
    
    // Only include airports with IATA codes (commercial airports)
    // Filter out empty, \N, and invalid codes
    if (iataCode && iataCode.trim() && iataCode !== '\\N' && 
        iataCode.trim().length >= 3 && iataCode.trim().length <= 4) {
      // Try to find name in various possible column names (case-insensitive)
      const name = airport.Name || airport.name || airport.airport_name || 
                   airport.airportName || airport.airport || 'Unknown Airport';
      
      // Try to find city in various possible column names (case-insensitive)
      const city = airport.City || airport.city || airport.municipality || 
                   airport.city_name || airport.cityName || 
                   airport.municipality_name || name || 'Unknown';
      
      // Try to find country in various possible column names (case-insensitive)
      const country = airport.Country || airport.country || airport.iso_country || 
                      airport.country_name || airport.countryName || 
                      airport.iso_country_code || 'Unknown';
      
      airports.push({
        iata: iataCode.trim().toUpperCase(),
        name: name.trim() || 'Unknown Airport',
        city: city.trim() || 'Unknown',
        country: country.trim() || 'Unknown',
      });
    }
  }
  
  return airports;
}

// Generate TypeScript file
function generateTypeScript(airports) {
  const header = `// Comprehensive airport database with IATA codes, names, cities, and countries
// Generated from Kaggle airports dataset: https://www.kaggle.com/datasets/thoudamyoihenba/airports
// Total airports: ${airports.length}

export interface Airport {
  iata: string
  name: string
  city: string
  country: string
  // For city-level searches (all airports in a city)
  isCity?: boolean
}

// All commercial airports worldwide
export const airports: Airport[] = [
`;

  const footer = `]

// Search function to find airports by query
export function searchAirports(query: string): Airport[] {
  if (!query || query.trim().length === 0) {
    return []
  }

  const lowerQuery = query.toLowerCase().trim()

  // First, try to find exact IATA code match
  const exactIataMatch = airports.find((airport) => airport.iata.toLowerCase() === lowerQuery)
  if (exactIataMatch) {
    return [exactIataMatch]
  }

  // Then search by name, city, country, or IATA code
  const results = airports.filter((airport) => {
    const searchableText = \`\${airport.iata} \${airport.name} \${airport.city} \${airport.country}\`.toLowerCase()
    return searchableText.includes(lowerQuery)
  })

  // Sort results: city-level options first, then by relevance
  return results.sort((a, b) => {
    // City-level options first
    if (a.isCity && !b.isCity) return -1
    if (!a.isCity && b.isCity) return 1

    // Then by how early the match appears (earlier = more relevant)
    const aIndex = \`\${a.iata} \${a.name} \${a.city}\`.toLowerCase().indexOf(lowerQuery)
    const bIndex = \`\${b.iata} \${b.name} \${b.city}\`.toLowerCase().indexOf(lowerQuery)

    if (aIndex !== bIndex) {
      return aIndex - bIndex
    }

    // Finally, prefer shorter names (more specific)
    return a.name.length - b.name.length
  })
}

// Get airport by IATA code
export function getAirportByIata(iata: string): Airport | undefined {
  return airports.find((airport) => airport.iata.toLowerCase() === iata.toLowerCase())
}

// Format airport for display
export function formatAirport(airport: Airport): string {
  if (airport.isCity) {
    return \`\${airport.name}\`
  }
  return \`\${airport.name} (\${airport.iata})\`
}

// Format airport for display with city
export function formatAirportWithCity(airport: Airport): string {
  if (airport.isCity) {
    return \`\${airport.name}, \${airport.country}\`
  }
  return \`\${airport.name} (\${airport.iata}), \${airport.city}, \${airport.country}\`
}

// Expand city-level airport code to individual airports
// NOTE: City-level airports have been removed - this function now just returns the code as-is
export function expandCityAirport(iata: string): string[] {
  // City-level airports removed - just return the code as-is
  return [iata]
}
`;

  // Generate airport entries
  const airportEntries = airports.map(airport => {
    // Escape special characters in strings
    const escapeString = (str) => {
      return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    };
    
    return `  { iata: "${airport.iata}", name: "${escapeString(airport.name)}", city: "${escapeString(airport.city)}", country: "${escapeString(airport.country)}" },`;
  });

  return header + airportEntries.join('\n') + '\n' + footer;
}

// Main execution
try {
  console.log('Reading CSV file from:', csvPath);
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Error: CSV file not found at:', csvPath);
    console.error('Please download the airports CSV from Kaggle and place it at:', csvPath);
    console.error('Kaggle URL: https://www.kaggle.com/datasets/thoudamyoihenba/airports');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  console.log('✅ CSV file read successfully');
  
  // Show first few lines to help debug column names
  const firstLines = csvContent.split('\n').slice(0, 3);
  console.log('\n📋 First few lines of CSV:');
  firstLines.forEach((line, i) => {
    if (i < 2) console.log(`   ${line.substring(0, 100)}...`);
  });
  console.log('');
  
  console.log('Parsing CSV...');
  const airports = parseCSV(csvContent);
  console.log(`✅ Parsed ${airports.length} airports with IATA codes`);
  
  // Remove duplicates (keep first occurrence)
  const seen = new Set();
  const uniqueAirports = airports.filter(airport => {
    if (seen.has(airport.iata)) {
      return false;
    }
    seen.add(airport.iata);
    return true;
  });
  
  console.log(`✅ Removed duplicates: ${airports.length - uniqueAirports.length} duplicates found`);
  console.log(`✅ Final count: ${uniqueAirports.length} unique airports`);
  
  console.log('Generating TypeScript file...');
  const tsContent = generateTypeScript(uniqueAirports);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, tsContent, 'utf-8');
  console.log('✅ TypeScript file generated successfully at:', outputPath);
  console.log(`✅ Total airports in database: ${uniqueAirports.length}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}


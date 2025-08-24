const fs = require('fs');
const path = require('path');

// Simple script to import the 133 species CSV via the API
async function import133Species() {
  try {
    console.log('🚀 Starting import of 133 species...');
    
    const csvPath = path.join(__dirname, 'data', '133 extinct species.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found at:', csvPath);
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath);
    const formData = new FormData();
    
    // Create a File-like object
    const file = new File([csvContent], '133 extinct species.csv', { type: 'text/csv' });
    
    formData.append('file', file);
    formData.append('listName', '133 Diverse Species');
    formData.append('listDescription', 'Comprehensive list of 133 extinct species including both animals and plants with detailed information');
    
    console.log('📤 Uploading CSV file...');
    
    const response = await fetch('http://localhost:3000/api/import-new-species', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Import successful!');
      console.log(`📊 Imported ${result.imported} species`);
      console.log(`📝 Message: ${result.message}`);
    } else {
      console.error('❌ Import failed:');
      console.error('Errors:', result.errors);
      console.error('Message:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

// Check if we're in Node.js environment
if (typeof window === 'undefined') {
  // Node.js environment - we need to use node-fetch and form-data
  console.log('⚠️  This script needs to be run in a browser environment or with additional Node.js packages.');
  console.log('💡 Instead, use the admin panel at http://localhost:3000/admin');
  console.log('   1. Go to the "Species Lists" tab');
  console.log('   2. Click "Import New List"');
  console.log('   3. Upload the "133 extinct species.csv" file');
  console.log('   4. Set name to "133 Diverse Species"');
  console.log('   5. Click "Import CSV"');
} else {
  // Browser environment
  import133Species();
}
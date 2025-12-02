import { AssetCategoryService } from '../src/services/assets/AssetCategoryService';
import { AssetTemplateService } from '../src/services/assets/AssetTemplateService';

const categoryService = new AssetCategoryService();
const templateService = new AssetTemplateService();

async function seedTemplates() {
    console.log('🌱 Seeding Asset Categories and Templates...');

    // 1. Bike
    console.log('Creating Bike Category...');
    const bike = await categoryService.createCategory({
        slug: 'bike',
        name: 'Bicycle',
        description: 'Standard bicycle registration'
    });
    await templateService.createTemplate(bike.id, {
        version: 1,
        fields: [
            { name: 'brand', label: 'Brand', type: 'string', required: true, public: true },
            { name: 'model', label: 'Model', type: 'string', required: true, public: true },
            { name: 'serialNumber', label: 'Frame Number', type: 'string', required: true, public: true },
            { name: 'color', label: 'Color', type: 'string', required: false, public: true },
            { name: 'purchaseDate', label: 'Purchase Date', type: 'date', required: false, public: false },
            { name: 'price', label: 'Price', type: 'number', required: false, public: false }
        ]
    }, true);

    // 2. Car
    console.log('Creating Car Category...');
    const car = await categoryService.createCategory({
        slug: 'car',
        name: 'Automobile',
        description: 'Cars, trucks, and other vehicles'
    });
    await templateService.createTemplate(car.id, {
        version: 1,
        fields: [
            { name: 'vin', label: 'VIN', type: 'string', required: true, public: true },
            { name: 'make', label: 'Make', type: 'string', required: true, public: true },
            { name: 'model', label: 'Model', type: 'string', required: true, public: true },
            { name: 'year', label: 'Year', type: 'number', required: true, public: true },
            { name: 'plate', label: 'License Plate', type: 'string', required: true, public: false }
        ]
    }, true);

    // 3. Pet
    console.log('Creating Pet Category...');
    const pet = await categoryService.createCategory({
        slug: 'pet',
        name: 'Pet',
        description: 'Dogs, cats, and other pets'
    });
    await templateService.createTemplate(pet.id, {
        version: 1,
        fields: [
            { name: 'name', label: 'Name', type: 'string', required: true, public: true },
            { name: 'species', label: 'Species', type: 'enum', options: ['Dog', 'Cat', 'Bird', 'Other'], required: true, public: true },
            { name: 'breed', label: 'Breed', type: 'string', required: false, public: true },
            { name: 'birthDate', label: 'Birth Date', type: 'date', required: false, public: true },
            { name: 'microchip', label: 'Microchip ID', type: 'string', required: false, public: false }
        ]
    }, true);

    console.log('✅ Seeding Completed!');
}

// Run if called directly
if (require.main === module) {
    seedTemplates();
}

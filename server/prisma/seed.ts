import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = bcryptjs.hashSync('password123', 10);

  // ─── Users ───────────────────────────────────────────────────────────────

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@fleet.com' },
    update: {},
    create: {
      email: 'admin@fleet.com',
      passwordHash,
      firstName: 'James',
      lastName: 'Anderson',
      role: 'ADMIN',
      isActive: true,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@fleet.com' },
    update: {},
    create: {
      email: 'manager@fleet.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Mitchell',
      role: 'FLEET_MANAGER',
      isActive: true,
    },
  });

  const serviceUser = await prisma.user.upsert({
    where: { email: 'service@fleet.com' },
    update: {},
    create: {
      email: 'service@fleet.com',
      passwordHash,
      firstName: 'Mike',
      lastName: 'Torres',
      role: 'SERVICE_COMPANY',
      isActive: true,
    },
  });

  console.log('Users created.');

  // ─── Vehicles ────────────────────────────────────────────────────────────

  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        vin: '1HGBH41JXMN109186',
        licensePlate: 'FLT-1001',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        color: 'White',
        status: 'ACTIVE',
        currentKilometers: 24500,
        fuelType: 'Gasoline',
        purchaseDate: new Date('2022-03-15'),
        purchasePrice: 28500.00,
        notes: 'Fleet sedan - excellent condition',
        leaseCompany: 'ABC Leasing',
        leaseAgreementNo: 'LA-2022-001',
        leaseStartDate: new Date('2022-03-15'),
        leaseEndDate: new Date('2027-03-14'),
        monthlyLeaseCost: 650.00,
        currentBookValue: 18500.00,
        fleetNumber: 'FL-001',
        insuranceProvider: 'SafeGuard Insurance',
        insurancePolicyNo: 'SG-VH-10001',
        coverageType: 'Comprehensive',
        policyStartDate: new Date('2025-01-01'),
        policyExpiryDate: new Date('2026-01-01'),
        premiumAmount: 1200.00,
        registrationExpiry: new Date('2026-06-30'),
        warrantyExpiry: new Date('2027-03-15'),
      },
    }),
    prisma.vehicle.create({
      data: {
        vin: '1FTFW1ET5DFC10312',
        licensePlate: 'FLT-1002',
        make: 'Ford',
        model: 'F-150',
        year: 2021,
        color: 'Blue',
        status: 'ACTIVE',
        currentKilometers: 45200,
        fuelType: 'Gasoline',
        purchaseDate: new Date('2021-06-20'),
        purchasePrice: 42000.00,
        notes: 'Work truck - heavy duty use',
        leaseCompany: 'Fleet Finance Co',
        leaseAgreementNo: 'FF-2021-045',
        leaseStartDate: new Date('2021-06-20'),
        leaseEndDate: new Date('2026-06-19'),
        monthlyLeaseCost: 890.00,
        currentBookValue: 28000.00,
        fleetNumber: 'FL-002',
        insuranceProvider: 'National Fleet Insurance',
        insurancePolicyNo: 'NF-VH-20045',
        coverageType: 'Comprehensive',
        policyStartDate: new Date('2025-03-01'),
        policyExpiryDate: new Date('2026-03-01'),
        premiumAmount: 1850.00,
      },
    }),
    prisma.vehicle.create({
      data: {
        vin: '2HGFC2F59MH522345',
        licensePlate: 'FLT-1003',
        make: 'Honda',
        model: 'Civic',
        year: 2023,
        color: 'Silver',
        status: 'ACTIVE',
        currentKilometers: 12300,
        fuelType: 'Gasoline',
        purchaseDate: new Date('2023-01-10'),
        purchasePrice: 25800.00,
        leaseCompany: 'ABC Leasing',
        leaseAgreementNo: 'LA-2023-012',
        leaseStartDate: new Date('2023-01-10'),
        leaseEndDate: new Date('2028-01-09'),
        monthlyLeaseCost: 520.00,
        currentBookValue: 21000.00,
        fleetNumber: 'FL-003',
        insuranceProvider: 'SafeGuard Insurance',
        insurancePolicyNo: 'SG-VH-10023',
        coverageType: 'Third Party',
        policyStartDate: new Date('2025-02-01'),
        policyExpiryDate: new Date('2026-02-01'),
        premiumAmount: 800.00,
      },
    }),
    prisma.vehicle.create({
      data: {
        vin: '1G1YY22G965109871',
        licensePlate: 'FLT-1004',
        make: 'Chevrolet',
        model: 'Malibu',
        year: 2020,
        color: 'Black',
        status: 'IN_SERVICE',
        currentKilometers: 67800,
        fuelType: 'Gasoline',
        purchaseDate: new Date('2020-04-05'),
        purchasePrice: 26200.00,
        notes: 'Currently undergoing brake service',
      },
    }),
    prisma.vehicle.create({
      data: {
        vin: 'WBAPH5C55BA271190',
        licensePlate: 'FLT-1005',
        make: 'BMW',
        model: '3 Series',
        year: 2022,
        color: 'Gray',
        status: 'ACTIVE',
        currentKilometers: 31400,
        fuelType: 'Gasoline',
        purchaseDate: new Date('2022-08-12'),
        purchasePrice: 45500.00,
        notes: 'Executive vehicle',
      },
    }),
    prisma.vehicle.create({
      data: {
        vin: '5YFBURHE1HP643291',
        licensePlate: 'FLT-1006',
        make: 'Toyota',
        model: 'Corolla',
        year: 2024,
        color: 'Red',
        status: 'ACTIVE',
        currentKilometers: 5200,
        fuelType: 'Hybrid',
        purchaseDate: new Date('2024-02-01'),
        purchasePrice: 27300.00,
      },
    }),
    prisma.vehicle.create({
      data: {
        vin: '1FADP3F29JL238576',
        licensePlate: 'FLT-1007',
        make: 'Ford',
        model: 'Focus',
        year: 2019,
        color: 'Green',
        status: 'OUT_OF_SERVICE',
        currentKilometers: 84500,
        fuelType: 'Gasoline',
        purchaseDate: new Date('2019-07-22'),
        purchasePrice: 21000.00,
        notes: 'Awaiting parts for engine repair',
      },
    }),
    prisma.vehicle.create({
      data: {
        vin: '1HGCV1F34LA048723',
        licensePlate: 'FLT-1008',
        make: 'Honda',
        model: 'Accord',
        year: 2021,
        color: 'White',
        status: 'ACTIVE',
        currentKilometers: 38900,
        fuelType: 'Gasoline',
        purchaseDate: new Date('2021-11-30'),
        purchasePrice: 32100.00,
      },
    }),
    prisma.vehicle.create({
      data: {
        vin: '3GNAXHEV5NL152847',
        licensePlate: 'FLT-1009',
        make: 'Chevrolet',
        model: 'Equinox',
        year: 2023,
        color: 'Blue',
        status: 'ACTIVE',
        currentKilometers: 15700,
        fuelType: 'Gasoline',
        purchaseDate: new Date('2023-05-18'),
        purchasePrice: 33500.00,
      },
    }),
    prisma.vehicle.create({
      data: {
        vin: 'WBA8E9C50GK584219',
        licensePlate: 'FLT-1010',
        make: 'BMW',
        model: '5 Series',
        year: 2020,
        color: 'Black',
        status: 'RETIRED',
        currentKilometers: 78300,
        fuelType: 'Diesel',
        purchaseDate: new Date('2020-01-15'),
        purchasePrice: 55000.00,
        notes: 'Retired from fleet - high kilometers',
      },
    }),
  ]);

  console.log('Vehicles created.');

  // ─── Drivers ─────────────────────────────────────────────────────────────

  const drivers = await Promise.all([
    prisma.driver.create({
      data: {
        employeeId: 'EMP001',
        firstName: 'Robert',
        lastName: 'Johnson',
        email: 'robert.johnson@company.com',
        phone: '555-0101',
        licenseNumber: 'DL-98234571',
        licenseExpiry: new Date('2027-08-15'),
        status: 'ACTIVE',
      },
    }),
    prisma.driver.create({
      data: {
        employeeId: 'EMP002',
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria.garcia@company.com',
        phone: '555-0102',
        licenseNumber: 'DL-76543219',
        licenseExpiry: new Date('2026-11-20'),
        status: 'ACTIVE',
      },
    }),
    prisma.driver.create({
      data: {
        employeeId: 'EMP003',
        firstName: 'David',
        lastName: 'Williams',
        email: 'david.williams@company.com',
        phone: '555-0103',
        licenseNumber: 'DL-45678123',
        licenseExpiry: new Date('2027-03-10'),
        status: 'ACTIVE',
      },
    }),
    prisma.driver.create({
      data: {
        employeeId: 'EMP004',
        firstName: 'Jennifer',
        lastName: 'Brown',
        email: 'jennifer.brown@company.com',
        phone: '555-0104',
        licenseNumber: 'DL-32198765',
        licenseExpiry: new Date('2026-06-30'),
        status: 'ACTIVE',
      },
    }),
    prisma.driver.create({
      data: {
        employeeId: 'EMP005',
        firstName: 'Michael',
        lastName: 'Davis',
        email: 'michael.davis@company.com',
        phone: '555-0105',
        licenseNumber: 'DL-87654321',
        licenseExpiry: new Date('2027-01-25'),
        status: 'ACTIVE',
      },
    }),
    prisma.driver.create({
      data: {
        employeeId: 'EMP006',
        firstName: 'Lisa',
        lastName: 'Martinez',
        email: 'lisa.martinez@company.com',
        phone: '555-0106',
        licenseNumber: 'DL-11223344',
        licenseExpiry: new Date('2026-09-05'),
        status: 'INACTIVE',
        notes: 'On leave of absence',
      },
    }),
    prisma.driver.create({
      data: {
        employeeId: 'EMP007',
        firstName: 'Kevin',
        lastName: 'Wilson',
        email: 'kevin.wilson@company.com',
        phone: '555-0107',
        licenseNumber: 'DL-55667788',
        licenseExpiry: new Date('2025-12-15'),
        status: 'SUSPENDED',
        notes: 'License expired - pending renewal',
      },
    }),
    prisma.driver.create({
      data: {
        employeeId: 'EMP008',
        firstName: 'Amanda',
        lastName: 'Taylor',
        email: 'amanda.taylor@company.com',
        phone: '555-0108',
        licenseNumber: 'DL-99887766',
        licenseExpiry: new Date('2027-05-20'),
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log('Drivers created.');

  // ─── Assignments ─────────────────────────────────────────────────────────

  // 5 active assignments
  await prisma.assignment.create({
    data: {
      vehicleId: vehicles[0].id,
      driverId: drivers[0].id,
      status: 'ACTIVE',
      startDate: new Date('2024-01-15'),
      notes: 'Primary vehicle assignment',
      createdBy: managerUser.id,
    },
  });

  await prisma.assignment.create({
    data: {
      vehicleId: vehicles[1].id,
      driverId: drivers[1].id,
      status: 'ACTIVE',
      startDate: new Date('2024-02-01'),
      notes: 'Field operations truck',
      createdBy: managerUser.id,
    },
  });

  await prisma.assignment.create({
    data: {
      vehicleId: vehicles[2].id,
      driverId: drivers[2].id,
      status: 'ACTIVE',
      startDate: new Date('2024-03-10'),
      createdBy: managerUser.id,
    },
  });

  await prisma.assignment.create({
    data: {
      vehicleId: vehicles[4].id,
      driverId: drivers[3].id,
      status: 'ACTIVE',
      startDate: new Date('2024-04-01'),
      notes: 'Executive transport',
      createdBy: adminUser.id,
    },
  });

  await prisma.assignment.create({
    data: {
      vehicleId: vehicles[5].id,
      driverId: drivers[4].id,
      status: 'ACTIVE',
      startDate: new Date('2024-05-15'),
      createdBy: managerUser.id,
    },
  });

  // 3 historical (ended) assignments
  await prisma.assignment.create({
    data: {
      vehicleId: vehicles[6].id,
      driverId: drivers[5].id,
      status: 'ENDED',
      startDate: new Date('2023-06-01'),
      endDate: new Date('2024-01-31'),
      notes: 'Ended due to vehicle out of service',
      createdBy: managerUser.id,
    },
  });

  await prisma.assignment.create({
    data: {
      vehicleId: vehicles[9].id,
      driverId: drivers[6].id,
      status: 'ENDED',
      startDate: new Date('2023-01-15'),
      endDate: new Date('2023-12-20'),
      notes: 'Vehicle retired from fleet',
      createdBy: managerUser.id,
    },
  });

  await prisma.assignment.create({
    data: {
      vehicleId: vehicles[7].id,
      driverId: drivers[7].id,
      status: 'ENDED',
      startDate: new Date('2023-09-01'),
      endDate: new Date('2024-03-15'),
      notes: 'Reassigned to different vehicle',
      createdBy: adminUser.id,
    },
  });

  console.log('Assignments created.');

  // ─── Service Providers ───────────────────────────────────────────────────

  const serviceProviders = await Promise.all([
    prisma.serviceProvider.create({
      data: {
        name: 'AutoCare Plus',
        contactName: 'Tom Richards',
        email: 'tom@autocareplus.com',
        phone: '555-0201',
        address: '1234 Main Street, Suite 100, Springfield, IL 62701',
        specialties: JSON.stringify(['Oil Change', 'Brake Service', 'Tire Service', 'General Maintenance']),
        isActive: true,
      },
    }),
    prisma.serviceProvider.create({
      data: {
        name: 'FleetFix Solutions',
        contactName: 'Diana Patel',
        email: 'diana@fleetfix.com',
        phone: '555-0202',
        address: '5678 Industrial Blvd, Bay 12, Springfield, IL 62704',
        specialties: JSON.stringify(['Engine Repair', 'Transmission', 'Electrical', 'Diagnostics', 'Fleet Inspections']),
        isActive: true,
      },
    }),
  ]);

  console.log('Service providers created.');

  // ─── Service Type Configs ────────────────────────────────────────────────

  const serviceTypes = await Promise.all([
    prisma.serviceTypeConfig.create({
      data: {
        name: 'Oil Change',
        description: 'Standard engine oil and filter replacement',
        category: 'Preventive Maintenance',
        estimatedDuration: '60 min',
        isActive: true,
      },
    }),
    prisma.serviceTypeConfig.create({
      data: {
        name: 'Tire Rotation',
        description: 'Rotate tires to ensure even wear across all positions',
        category: 'Preventive Maintenance',
        estimatedDuration: '45 min',
        isActive: true,
      },
    }),
    prisma.serviceTypeConfig.create({
      data: {
        name: 'Brake Inspection',
        description: 'Full inspection of brake pads, rotors, calipers, and fluid levels',
        category: 'Safety Inspection',
        estimatedDuration: '90 min',
        isActive: true,
      },
    }),
    prisma.serviceTypeConfig.create({
      data: {
        name: 'Engine Tune-Up',
        description: 'Comprehensive engine tune-up including spark plugs, filters, and timing',
        category: 'Corrective Maintenance',
        estimatedDuration: '180 min',
        isActive: true,
      },
    }),
    prisma.serviceTypeConfig.create({
      data: {
        name: 'Full Inspection',
        description: 'Complete multi-point vehicle inspection covering all major systems',
        category: 'Safety Inspection',
        estimatedDuration: '120 min',
        isActive: true,
      },
    }),
  ]);

  console.log('Service type configs created.');

  // ─── Service Interval Configs ────────────────────────────────────────────

  await Promise.all([
    prisma.serviceIntervalConfig.create({
      data: {
        serviceTypeId: serviceTypes[0].id, // Oil Change
        kilometerInterval: 5000,
        timeIntervalDays: 90,
        isActive: true,
      },
    }),
    prisma.serviceIntervalConfig.create({
      data: {
        serviceTypeId: serviceTypes[1].id, // Tire Rotation
        kilometerInterval: 7500,
        timeIntervalDays: 180,
        isActive: true,
      },
    }),
    prisma.serviceIntervalConfig.create({
      data: {
        serviceTypeId: serviceTypes[2].id, // Brake Inspection
        kilometerInterval: 15000,
        timeIntervalDays: 365,
        vehicleMake: 'Ford',
        isActive: true,
      },
    }),
  ]);

  console.log('Service interval configs created.');

  // ─── Service Records ─────────────────────────────────────────────────────

  // DRAFT
  await prisma.serviceRecord.create({
    data: {
      vehicleId: vehicles[0].id,
      serviceTypeConfigId: serviceTypes[0].id,
      status: 'DRAFT',
      description: 'Routine oil change for Toyota Camry at 25000 km',
      kilometersAtService: 24500,
      driverId: drivers[0].id,
      createdBy: managerUser.id,
    },
  });

  // SCHEDULED
  await prisma.serviceRecord.create({
    data: {
      vehicleId: vehicles[1].id,
      serviceProviderId: serviceProviders[0].id,
      serviceTypeConfigId: serviceTypes[1].id,
      status: 'SCHEDULED',
      description: 'Scheduled tire rotation for Ford F-150',
      scheduledDate: new Date('2026-03-01'),
      kilometersAtService: 45200,
      driverId: drivers[1].id,
      createdBy: managerUser.id,
    },
  });

  // AUTHORIZED
  await prisma.serviceRecord.create({
    data: {
      vehicleId: vehicles[2].id,
      serviceProviderId: serviceProviders[1].id,
      serviceTypeConfigId: serviceTypes[4].id,
      status: 'AUTHORIZED',
      description: 'Full multi-point inspection for Honda Civic',
      scheduledDate: new Date('2026-02-20'),
      authorizedBy: adminUser.id,
      authorizedAt: new Date('2026-02-15'),
      kilometersAtService: 12300,
      conditionBefore: 'GOOD',
      driverId: drivers[2].id,
      createdBy: managerUser.id,
    },
  });

  // IN_PROGRESS
  await prisma.serviceRecord.create({
    data: {
      vehicleId: vehicles[3].id,
      serviceProviderId: serviceProviders[0].id,
      serviceTypeConfigId: serviceTypes[2].id,
      status: 'IN_PROGRESS',
      description: 'Brake inspection and pad replacement for Chevrolet Malibu',
      scheduledDate: new Date('2026-02-10'),
      authorizedBy: adminUser.id,
      authorizedAt: new Date('2026-02-08'),
      startedAt: new Date('2026-02-10'),
      kilometersAtService: 67800,
      conditionBefore: 'FAIR',
      technicianNotes: 'Front brake pads worn to 2mm. Replacing front pads and resurfacing rotors.',
      laborCost: 200.00,
      partsCost: 180.00,
      additionalCharges: 20.00,
      vatAmount: 50.00,
      totalCostExclVat: 400.00,
      totalCostInclVat: 450.00,
      paymentMethod: 'Account',
      driverId: null,
      createdBy: managerUser.id,
    },
  });

  // COMPLETED
  await prisma.serviceRecord.create({
    data: {
      vehicleId: vehicles[4].id,
      serviceProviderId: serviceProviders[1].id,
      serviceTypeConfigId: serviceTypes[3].id,
      status: 'COMPLETED',
      description: 'Engine tune-up for BMW 3 Series',
      scheduledDate: new Date('2026-01-20'),
      authorizedBy: adminUser.id,
      authorizedAt: new Date('2026-01-18'),
      startedAt: new Date('2026-01-20'),
      completedAt: new Date('2026-01-21'),
      kilometersAtService: 31400,
      conditionBefore: 'GOOD',
      conditionAfter: 'EXCELLENT',
      technicianNotes: 'Replaced spark plugs, air filter, and fuel filter. Engine running smoothly.',
      internalNotes: 'Consider scheduling full inspection in next quarter.',
      laborCost: 350.00,
      partsCost: 320.00,
      additionalCharges: 30.00,
      vatAmount: 80.00,
      totalCostExclVat: 700.00,
      totalCostInclVat: 780.00,
      invoiceNumber: 'INV-2026-0021',
      invoiceDate: new Date('2026-01-21'),
      paymentMethod: 'EFT',
      driverId: drivers[3].id,
      createdBy: managerUser.id,
    },
  });

  // APPROVED
  await prisma.serviceRecord.create({
    data: {
      vehicleId: vehicles[7].id,
      serviceProviderId: serviceProviders[0].id,
      serviceTypeConfigId: serviceTypes[0].id,
      status: 'APPROVED',
      description: 'Standard oil change for Honda Accord',
      scheduledDate: new Date('2026-01-05'),
      authorizedBy: adminUser.id,
      authorizedAt: new Date('2026-01-03'),
      startedAt: new Date('2026-01-05'),
      completedAt: new Date('2026-01-05'),
      approvedBy: managerUser.id,
      approvedAt: new Date('2026-01-06'),
      kilometersAtService: 38900,
      conditionBefore: 'GOOD',
      conditionAfter: 'GOOD',
      technicianNotes: 'Used synthetic 0W-20 oil. Filter replaced.',
      laborCost: 45.00,
      partsCost: 35.00,
      additionalCharges: 0,
      vatAmount: 9.99,
      totalCostExclVat: 80.00,
      totalCostInclVat: 89.99,
      invoiceNumber: 'INV-2026-0005',
      invoiceDate: new Date('2026-01-05'),
      paymentMethod: 'Card',
      driverId: null,
      createdBy: serviceUser.id,
    },
  });

  console.log('Service records created.');

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

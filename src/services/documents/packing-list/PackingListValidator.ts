import { DocumentValidator } from '../base/DocumentValidator';
import { ValidationResult, ValidationError, ValidationWarning } from '../base/types';
import { 
  PackingListProcessingResult, 
  PackingListValidationRules, 
  PackingListItem, 
  PackingListHeader, 
  PackingListContainer 
} from './types';

/**
 * Validator specific to Packing List documents
 */
export class PackingListValidator {
  constructor(private rules: PackingListValidationRules) {}

  /**
   * Main validation method for packing list data
   */
  validate(data: PackingListProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate structure
    this.validateStructure(data, errors, warnings);

    // Validate header
    if (data.header && this.rules.requireHeader) {
      this.validateHeader(data.header, errors, warnings);
    }

    // Validate containers
    if (data.containers && this.rules.requireContainers) {
      this.validateContainers(data.containers, errors, warnings);
    }

    // Validate items
    if (data.items_por_container && this.rules.requireItems) {
      this.validateItems(data.items_por_container, errors, warnings);
    }

    // Cross-validation between sections
    this.validateConsistency(data, errors, warnings);

    return DocumentValidator.createValidationResult(errors, warnings);
  }

  /**
   * Validate specific step data
   */
  validateStep(stepNumber: number, data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    switch (stepNumber) {
      case 1:
        this.validateStep1Data(data, errors, warnings);
        break;
      case 2:
        this.validateStep2Data(data, errors, warnings);
        break;
      case 3:
        this.validateStep3Data(data, errors, warnings);
        break;
      case 4:
        this.validateStep4Data(data, errors, warnings);
        break;
      default:
        DocumentValidator.addError(errors, 'step', `Unknown step number: ${stepNumber}`, 'UNKNOWN_STEP');
    }

    return DocumentValidator.createValidationResult(errors, warnings);
  }

  /**
   * Validate overall data structure
   */
  private validateStructure(data: PackingListProcessingResult, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!data || typeof data !== 'object') {
      DocumentValidator.addError(errors, 'data', 'Dados inválidos ou ausentes', 'INVALID_DATA_STRUCTURE');
      return;
    }

    // Check required sections
    if (this.rules.requireHeader && !data.header) {
      DocumentValidator.addError(errors, 'header', 'Seção de cabeçalho ausente', 'MISSING_HEADER');
    }

    if (this.rules.requireContainers && (!data.containers || !Array.isArray(data.containers))) {
      DocumentValidator.addError(errors, 'containers', 'Seção de contêineres ausente ou inválida', 'MISSING_CONTAINERS');
    }

    if (this.rules.requireItems && (!data.items_por_container || !Array.isArray(data.items_por_container))) {
      DocumentValidator.addError(errors, 'items', 'Seção de itens ausente ou inválida', 'MISSING_ITEMS');
    }
  }

  /**
   * Validate header data
   */
  private validateHeader(header: PackingListHeader, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate invoice number
    if (!header.invoice || typeof header.invoice !== 'string' || header.invoice.trim() === '') {
      DocumentValidator.addError(errors, 'header.invoice', 'Número da invoice ausente ou inválido', 'MISSING_INVOICE');
    }

    // Validate numeric fields
    if (header.package_total !== undefined && !DocumentValidator.validateNumeric(header.package_total, { min: 0 })) {
      DocumentValidator.addError(errors, 'header.package_total', 'Total de pacotes inválido', 'INVALID_PACKAGE_TOTAL');
    }

    if (header.total_gw !== undefined && !DocumentValidator.validateNumeric(header.total_gw, { min: 0, allowDecimals: true })) {
      DocumentValidator.addError(errors, 'header.total_gw', 'Peso total inválido', 'INVALID_TOTAL_WEIGHT');
    }

    if (header.items_qty_total !== undefined && !DocumentValidator.validateNumeric(header.items_qty_total, { min: 0 })) {
      DocumentValidator.addError(errors, 'header.items_qty_total', 'Quantidade total de itens inválida', 'INVALID_ITEMS_TOTAL');
    }

    // Validate date format
    if (header.date && !DocumentValidator.validateDateFormat(header.date)) {
      DocumentValidator.addError(errors, 'header.date', 'Formato de data inválido (esperado DD/MM/YYYY)', 'INVALID_DATE_FORMAT');
    }

    // Check for missing important fields
    if (!header.consignee) {
      DocumentValidator.addWarning(warnings, 'header.consignee', 'Consignatário não informado');
    }

    if (!header.load_port) {
      DocumentValidator.addWarning(warnings, 'header.load_port', 'Porto de embarque não informado');
    }

    if (!header.destination) {
      DocumentValidator.addWarning(warnings, 'header.destination', 'Porto de destino não informado');
    }
  }

  /**
   * Validate containers data
   */
  private validateContainers(containers: PackingListContainer[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (containers.length === 0) {
      DocumentValidator.addError(errors, 'containers', 'Nenhum contêiner encontrado', 'NO_CONTAINERS');
      return;
    }

    containers.forEach((container, index) => {
      const prefix = `containers[${index}]`;

      // Validate container number
      if (this.rules.validateContainerNumbers && container.container) {
        if (!DocumentValidator.validateContainerNumber(container.container)) {
          DocumentValidator.addError(errors, `${prefix}.container`, 
            `Número do contêiner inválido: ${container.container}`, 'INVALID_CONTAINER_NUMBER');
        }
      }

      // Validate numeric fields
      if (container.quantidade_de_pacotes !== undefined && 
          !DocumentValidator.validateNumeric(container.quantidade_de_pacotes, { min: 0 })) {
        DocumentValidator.addError(errors, `${prefix}.quantidade_de_pacotes`, 
          'Quantidade de pacotes inválida', 'INVALID_PACKAGE_QUANTITY');
      }

      if (container.peso_bruto !== undefined && 
          !DocumentValidator.validateNumeric(container.peso_bruto, { min: 0, allowDecimals: true })) {
        DocumentValidator.addError(errors, `${prefix}.peso_bruto`, 
          'Peso bruto inválido', 'INVALID_GROSS_WEIGHT');
      }

      if (container.volume !== undefined && 
          !DocumentValidator.validateNumeric(container.volume, { min: 0, allowDecimals: true })) {
        DocumentValidator.addError(errors, `${prefix}.volume`, 
          'Volume inválido', 'INVALID_VOLUME');
      }

      // Validate package ranges
      if (container.from_package !== undefined && container.to_package !== undefined) {
        if (container.from_package > container.to_package) {
          DocumentValidator.addError(errors, `${prefix}.package_range`, 
            'Range de pacotes inválido (from_package > to_package)', 'INVALID_PACKAGE_RANGE');
        }
      }

      // Check for missing required fields
      if (!container.container) {
        DocumentValidator.addError(errors, `${prefix}.container`, 
          'Número do contêiner é obrigatório', 'MISSING_CONTAINER_NUMBER');
      }

      if (!container.booking) {
        DocumentValidator.addWarning(warnings, `${prefix}.booking`, 
          'Número de booking não informado');
      }

      if (!container.tipo_container) {
        DocumentValidator.addWarning(warnings, `${prefix}.tipo_container`, 
          'Tipo de contêiner não informado');
      }
    });

    // Check for duplicate container numbers
    const containerNumbers = containers.map(c => c.container).filter(Boolean);
    const duplicates = containerNumbers.filter((num, index) => containerNumbers.indexOf(num) !== index);
    
    if (duplicates.length > 0) {
      DocumentValidator.addError(errors, 'containers.duplicates', 
        `Contêineres duplicados encontrados: ${duplicates.join(', ')}`, 'DUPLICATE_CONTAINERS');
    }
  }

  /**
   * Validate items data
   */
  private validateItems(items: PackingListItem[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (items.length === 0) {
      DocumentValidator.addError(errors, 'items', 'Nenhum item encontrado', 'NO_ITEMS');
      return;
    }

    items.forEach((item, index) => {
      const prefix = `items[${index}]`;

      // Validate item number
      if (this.rules.validateItemNumberSequence && item.item_number !== undefined) {
        if (!DocumentValidator.validateNumeric(item.item_number, { min: 1 })) {
          DocumentValidator.addError(errors, `${prefix}.item_number`, 
            'Número do item inválido', 'INVALID_ITEM_NUMBER');
        }
      }

      // Validate quantities
      if (item.quantidade_de_pacotes !== undefined && 
          !DocumentValidator.validateNumeric(item.quantidade_de_pacotes, { min: 0 })) {
        DocumentValidator.addError(errors, `${prefix}.quantidade_de_pacotes`, 
          'Quantidade de pacotes inválida', 'INVALID_PACKAGE_QUANTITY');
      }

      if (item.quantidade_por_pacote !== undefined && 
          !DocumentValidator.validateNumeric(item.quantidade_por_pacote, { min: 0 })) {
        DocumentValidator.addError(errors, `${prefix}.quantidade_por_pacote`, 
          'Quantidade por pacote inválida', 'INVALID_QUANTITY_PER_PACKAGE');
      }

      if (item.quantidade_total !== undefined && 
          !DocumentValidator.validateNumeric(item.quantidade_total, { min: 0 })) {
        DocumentValidator.addError(errors, `${prefix}.quantidade_total`, 
          'Quantidade total inválida', 'INVALID_TOTAL_QUANTITY');
      }

      // Validate weights
      if (item.peso_bruto_por_pacote !== undefined && 
          !DocumentValidator.validateNumeric(item.peso_bruto_por_pacote, { min: 0, allowDecimals: true })) {
        DocumentValidator.addError(errors, `${prefix}.peso_bruto_por_pacote`, 
          'Peso bruto por pacote inválido', 'INVALID_GROSS_WEIGHT_PER_PACKAGE');
      }

      if (item.peso_bruto_total !== undefined && 
          !DocumentValidator.validateNumeric(item.peso_bruto_total, { min: 0, allowDecimals: true })) {
        DocumentValidator.addError(errors, `${prefix}.peso_bruto_total`, 
          'Peso bruto total inválido', 'INVALID_TOTAL_GROSS_WEIGHT');
      }

      // Validate dimensions
      const dimensions = ['comprimento_pacote', 'largura_pacote', 'altura_pacote'];
      dimensions.forEach(dim => {
        const value = (item as any)[dim];
        if (value !== undefined && !DocumentValidator.validateNumeric(value, { min: 0, allowDecimals: true })) {
          DocumentValidator.addError(errors, `${prefix}.${dim}`, 
            `Dimensão inválida: ${dim}`, 'INVALID_DIMENSION');
        }
      });

      // Check for missing descriptions
      if (!item.descricao_ingles && !item.descricao_chines) {
        DocumentValidator.addWarning(warnings, `${prefix}.description`, 
          'Item sem descrição em inglês ou chinês', 
          'Adicione uma descrição para facilitar a identificação');
      }

      // Validate quantity consistency
      if (item.quantidade_de_pacotes && item.quantidade_por_pacote && item.quantidade_total) {
        const calculatedTotal = item.quantidade_de_pacotes * item.quantidade_por_pacote;
        if (Math.abs(calculatedTotal - item.quantidade_total) > 0.01) {
          DocumentValidator.addError(errors, `${prefix}.quantity_consistency`, 
            `Inconsistência nas quantidades: ${item.quantidade_de_pacotes} × ${item.quantidade_por_pacote} ≠ ${item.quantidade_total}`, 
            'QUANTITY_INCONSISTENCY');
        }
      }

      // Validate weight consistency
      if (item.peso_bruto_por_pacote && item.quantidade_de_pacotes && item.peso_bruto_total) {
        const calculatedTotal = item.peso_bruto_por_pacote * item.quantidade_de_pacotes;
        if (Math.abs(calculatedTotal - item.peso_bruto_total) > 0.01) {
          DocumentValidator.addError(errors, `${prefix}.weight_consistency`, 
            `Inconsistência nos pesos: ${item.peso_bruto_por_pacote} × ${item.quantidade_de_pacotes} ≠ ${item.peso_bruto_total}`, 
            'WEIGHT_INCONSISTENCY');
        }
      }
    });

    // Check item number sequence if required
    if (this.rules.validateItemNumberSequence) {
      this.validateItemNumberSequence(items, errors, warnings);
    }
  }

  /**
   * Validate item number sequence
   */
  private validateItemNumberSequence(items: PackingListItem[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    const itemNumbers = items
      .map(item => item.item_number)
      .filter(num => num !== undefined)
      .sort((a, b) => a! - b!);

    // Check for duplicates
    const duplicates = itemNumbers.filter((num, index) => itemNumbers.indexOf(num) !== index);
    if (duplicates.length > 0) {
      DocumentValidator.addError(errors, 'items.item_numbers', 
        `Números de itens duplicados: ${duplicates.join(', ')}`, 'DUPLICATE_ITEM_NUMBERS');
    }

    // Check for gaps in sequence
    for (let i = 1; i < itemNumbers.length; i++) {
      if (itemNumbers[i]! - itemNumbers[i-1]! > 1) {
        DocumentValidator.addWarning(warnings, 'items.item_numbers', 
          `Gap na sequência de itens entre ${itemNumbers[i-1]} e ${itemNumbers[i]}`);
      }
    }
  }

  /**
   * Validate consistency between different sections
   */
  private validateConsistency(data: PackingListProcessingResult, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!this.rules.validatePackageConsistency && !this.rules.validateWeightConsistency) {
      return;
    }

    const { header, containers, items_por_container } = data;

    // Validate package consistency
    if (this.rules.validatePackageConsistency && header && containers && items_por_container) {
      this.validatePackageConsistency(header, containers, items_por_container, errors, warnings);
    }

    // Validate weight consistency
    if (this.rules.validateWeightConsistency && header && containers && items_por_container) {
      this.validateWeightConsistency(header, containers, items_por_container, errors, warnings);
    }
  }

  /**
   * Validate package count consistency
   */
  private validatePackageConsistency(
    header: PackingListHeader, 
    containers: PackingListContainer[], 
    items: PackingListItem[], 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    const containerTotal = containers.reduce((sum, container) => 
      sum + (container.quantidade_de_pacotes || 0), 0);
    
    const itemsTotal = items.reduce((sum, item) => 
      sum + (item.quantidade_de_pacotes || 0), 0);

    // Check header vs containers
    if (header.package_total && Math.abs(header.package_total - containerTotal) > 0) {
      DocumentValidator.addError(errors, 'consistency.packages.header_containers', 
        `Total de pacotes no cabeçalho (${header.package_total}) não confere com total dos contêineres (${containerTotal})`, 
        'PACKAGE_TOTAL_MISMATCH');
    }

    // Check containers vs items
    if (Math.abs(containerTotal - itemsTotal) > 0) {
      DocumentValidator.addError(errors, 'consistency.packages.containers_items', 
        `Total de pacotes dos contêineres (${containerTotal}) não confere com total dos itens (${itemsTotal})`, 
        'PACKAGE_TOTAL_MISMATCH');
    }
  }

  /**
   * Validate weight consistency
   */
  private validateWeightConsistency(
    header: PackingListHeader, 
    containers: PackingListContainer[], 
    items: PackingListItem[], 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    const containerTotal = containers.reduce((sum, container) => 
      sum + (container.peso_bruto || 0), 0);
    
    const itemsTotal = items.reduce((sum, item) => 
      sum + (item.peso_bruto_total || 0), 0);

    // Allow small tolerance for rounding
    const tolerance = 0.1; // 100g tolerance

    // Check header vs containers
    if (header.total_gw && Math.abs(header.total_gw - containerTotal) > tolerance) {
      DocumentValidator.addWarning(warnings, 'consistency.weight.header_containers', 
        `Peso total no cabeçalho (${header.total_gw} kg) difere do total dos contêineres (${containerTotal} kg)`);
    }

    // Check containers vs items
    if (Math.abs(containerTotal - itemsTotal) > tolerance) {
      DocumentValidator.addWarning(warnings, 'consistency.weight.containers_items', 
        `Peso total dos contêineres (${containerTotal} kg) difere do total dos itens (${itemsTotal} kg)`);
    }
  }

  /**
   * Step-specific validation methods
   */
  private validateStep1Data(data: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!data || typeof data !== 'object') {
      DocumentValidator.addError(errors, 'step1.data', 'Dados do passo 1 inválidos', 'INVALID_STEP1_DATA');
      return;
    }

    // Validate required fields from step 1
    const requiredFields = ['invoice'];
    requiredFields.forEach(field => {
      if (!data[field]) {
        DocumentValidator.addError(errors, `step1.${field}`, 
          `Campo obrigatório ausente no passo 1: ${field}`, 'MISSING_STEP1_FIELD');
      }
    });
  }

  private validateStep2Data(data: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!Array.isArray(data)) {
      DocumentValidator.addError(errors, 'step2.data', 'Dados do passo 2 devem ser um array de contêineres', 'INVALID_STEP2_DATA');
      return;
    }

    if (data.length === 0) {
      DocumentValidator.addError(errors, 'step2.containers', 'Nenhum contêiner encontrado no passo 2', 'NO_STEP2_CONTAINERS');
    }
  }

  private validateStep3Data(data: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (typeof data !== 'string' || data.trim() === '') {
      DocumentValidator.addError(errors, 'step3.data', 'Explicação da disposição deve ser um texto não vazio', 'INVALID_STEP3_DATA');
    }
  }

  private validateStep4Data(data: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!Array.isArray(data)) {
      DocumentValidator.addError(errors, 'step4.data', 'Dados do passo 4 devem ser um array de itens', 'INVALID_STEP4_DATA');
      return;
    }

    if (data.length === 0) {
      DocumentValidator.addError(errors, 'step4.items', 'Nenhum item encontrado no passo 4', 'NO_STEP4_ITEMS');
    }
  }
}
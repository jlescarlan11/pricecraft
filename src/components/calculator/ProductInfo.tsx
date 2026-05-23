import React from 'react';
import { Input } from '../shared/Input';
import { MESSAGES } from '../../constants/app';

interface ProductInfoProps {
  businessName?: string;
  productName: string;
  batchSize: number;
  onChange: (field: 'productName' | 'batchSize' | 'businessName', value: string | number) => void;
  errors?: {
    productName?: string;
    batchSize?: string;
    businessName?: string;
  };
}

export const ProductInfo: React.FC<ProductInfoProps> = ({
  businessName = '',
  productName,
  batchSize,
  onChange,
  errors = {},
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Input
        label="Business name"
        value={businessName}
        onChange={(e) => onChange('businessName', e.target.value)}
        placeholder="e.g. Maria's Bakery"
        error={errors.businessName}
        helperText="Appears on printed pricing sheets."
      />
      <Input
        label="Product name"
        value={productName}
        onChange={(e) => onChange('productName', e.target.value)}
        placeholder="e.g. Chocolate chip cookies"
        error={errors.productName}
        required
      />
      <Input
        label="Batch size"
        type="number"
        value={batchSize || ''}
        onChange={(e) => {
          const val = e.target.value;
          onChange('batchSize', val === '' ? 0 : Number(val));
        }}
        placeholder="e.g. 12"
        error={errors.batchSize}
        helperText={MESSAGES.HELP_TEXT.BATCH_SIZE}
        required
        min={1}
      />
    </div>
  );
};

// ConfigFields.tsx
import React from 'react';
import {InlineField, Input, SecretInput, Select} from '@grafana/ui';

export const ConfigInputField = ({ label, tooltip, value, placeholder, onChange }: any) => (
    <InlineField label={label} labelWidth={30} tooltip={tooltip}>
        <Input value={value} placeholder={placeholder} width={40} onChange={onChange} />
    </InlineField>
);

export const ConfigSelectField = ({ label, tooltip, value, options, onChange }: any) => (
    <InlineField label={label} labelWidth={30} tooltip={tooltip}>
        <Select
            onChange={({value}) => {
                onChange(value);
            }}
            options={options}
            value={value}
            backspaceRemovesValue
        />
    </InlineField>
);

export const ConfigSecretInputField = ({ label, tooltip, value, placeholder, isConfigured, onReset, onChange }: any) => (
    <InlineField label={label} labelWidth={30} tooltip={tooltip}>
        <SecretInput
            isConfigured={isConfigured}
            value={value}
            placeholder={placeholder}
            width={40}
            onReset={onReset}
            onChange={onChange}
        />
    </InlineField>
);

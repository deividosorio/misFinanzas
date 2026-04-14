// Modificación del archivo BudgetManager.jsx para implementar opción de vinculación al formulario de creación recurrente: deudas o servicios.

import React, { useState } from 'react';

const BudgetManager = () => {
    const [paymentType, setPaymentType] = useState('');
    const [amount, setAmount] = useState(0);
    const [isDebt, setIsDebt] = useState(false);

    const handlePaymentTypeChange = (event) => {
        setPaymentType(event.target.value);
        setIsDebt(event.target.value === 'debt');
    };

    const handlePaymentSubmit = () => {
        if (isDebt) {
            // Lógica para registrar el movimiento de la deuda
            registerDebtMovement(amount);
        } else {
            // Lógica para registrar el pago de un servicio
            registerServicePayment(amount);
        }
    };

    const registerDebtMovement = (amount) => {
        // Implementar registro de evolución de deuda aquí
        console.log(`Deuda registrada por $${amount}`);
    };

    const registerServicePayment = (amount) => {
        // Implementar registro de pago de servicio aquí
        console.log(`Pago de servicio registrado por $${amount}`);
    };

    return (
        <div>
            <h1>Presupuesto Manager</h1>
            <select value={paymentType} onChange={handlePaymentTypeChange}>
                <option value=''>Seleccionar tipo de pago</option>
                <option value='debt'>Deuda</option>
                <option value='service'>Servicio</option>
            </select>
            <input type='number' value={amount} onChange={(e) => setAmount(e.target.value)} placeholder='Monto' />
            <button onClick={handlePaymentSubmit}>Registrar Pago</button>
        </div>
    );
};

export default BudgetManager;
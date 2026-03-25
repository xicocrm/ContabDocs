// cliente.controller.ts

import { Request, Response } from 'express';
import Cliente from '../models/cliente.model';

// Create a new cliente
export const createCliente = async (req: Request, res: Response) => {
    const clienteData = req.body;
    try {
        const newCliente = await Cliente.create(clienteData);
        res.status(201).json(newCliente);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Read all clientes
export const getClientes = async (req: Request, res: Response) => {
    try {
        const clientes = await Cliente.find();
        res.status(200).json(clientes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Read a single cliente by ID
export const getClienteById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const cliente = await Cliente.findById(id);
        if (!cliente) return res.status(404).json({ message: 'Cliente not found' });
        res.status(200).json(cliente);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a cliente by ID
export const updateCliente = async (req: Request, res: Response) => {
    const { id } = req.params;
    const clienteData = req.body;
    try {
        const updatedCliente = await Cliente.findByIdAndUpdate(id, clienteData, { new: true });
        if (!updatedCliente) return res.status(404).json({ message: 'Cliente not found' });
        res.status(200).json(updatedCliente);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a cliente by ID
export const deleteCliente = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const deletedCliente = await Cliente.findByIdAndDelete(id);
        if (!deletedCliente) return res.status(404).json({ message: 'Cliente not found' });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

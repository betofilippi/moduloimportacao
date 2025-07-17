'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Package, Scale, Users, Split, Merge } from 'lucide-react';
import { SharedBoxGroup, SharedBoxDetector } from '@/services/ocr/SharedBoxDetector';

interface SharedBoxEditorProps {
  group: SharedBoxGroup;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedGroup: SharedBoxGroup, action: 'distribute' | 'separate' | 'custom') => void;
}

export function SharedBoxEditor({ group, isOpen, onClose, onSave }: SharedBoxEditorProps) {
  const [editMode, setEditMode] = useState<'distribute' | 'separate' | 'custom'>('distribute');
  const [totalWeight, setTotalWeight] = useState<number>(group.totalWeight);
  const [individualWeights, setIndividualWeights] = useState<number[]>([]);

  useEffect(() => {
    // Initialize individual weights
    const weights = group.sharedItems.map(() => group.totalWeight / group.totalSharedItems);
    setIndividualWeights(weights);
  }, [group]);

  const handleDistributeEvenly = () => {
    const weightPerItem = totalWeight / group.totalSharedItems;
    setIndividualWeights(group.sharedItems.map(() => weightPerItem));
    setEditMode('distribute');
  };

  const handleSeparateBoxes = () => {
    setEditMode('separate');
  };

  const handleCustomWeights = () => {
    setEditMode('custom');
  };

  const handleIndividualWeightChange = (index: number, weight: number) => {
    const newWeights = [...individualWeights];
    newWeights[index] = weight;
    setIndividualWeights(newWeights);
  };

  const handleSave = () => {
    let updatedGroup: SharedBoxGroup;

    switch (editMode) {
      case 'distribute':
        // Distribute weight evenly
        const distributedItems = SharedBoxDetector.distributeWeight(group, totalWeight);
        updatedGroup = {
          ...group,
          sharedItems: distributedItems,
          totalWeight,
          isEdited: true
        };
        break;

      case 'separate':
        // Separate into individual boxes with custom weights
        const separatedItems = SharedBoxDetector.separateSharedBoxes(group, individualWeights);
        updatedGroup = {
          ...group,
          sharedItems: separatedItems,
          totalWeight: individualWeights.reduce((sum, w) => sum + w, 0),
          isEdited: true
        };
        break;

      case 'custom':
        // Custom weight distribution
        const customItems = group.sharedItems.map((item, index) => ({
          ...item,
          peso_bruto_por_pacote: individualWeights[index],
          peso_bruto_total: individualWeights[index],
          peso_liquido_por_pacote: individualWeights[index] * 0.95,
          peso_liquido_total: individualWeights[index] * 0.95
        }));
        updatedGroup = {
          ...group,
          sharedItems: customItems,
          totalWeight: individualWeights.reduce((sum, w) => sum + w, 0),
          isEdited: true
        };
        break;

      default:
        updatedGroup = group;
    }

    onSave(updatedGroup, editMode);
    onClose();
  };

  const totalIndividualWeight = individualWeights.reduce((sum, w) => sum + w, 0);
  const isWeightBalanced = Math.abs(totalIndividualWeight - totalWeight) < 0.01;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            Editor de Caixa Compartilhada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Master Item Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Item Principal (com peso)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Item #{group.masterItem.item_number}</p>
                  <p className="font-medium">{group.masterItem.descricao_ingles}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Peso Original</p>
                  <p className="font-medium">{group.masterItem.peso_bruto_por_pacote} KG</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant={editMode === 'distribute' ? 'default' : 'outline'}
              size="sm"
              onClick={handleDistributeEvenly}
              className="flex items-center gap-2"
            >
              <Merge className="h-4 w-4" />
              Distribuir Peso Igualmente
            </Button>
            <Button
              variant={editMode === 'separate' ? 'default' : 'outline'}
              size="sm"
              onClick={handleSeparateBoxes}
              className="flex items-center gap-2"
            >
              <Split className="h-4 w-4" />
              Separar Caixas
            </Button>
            <Button
              variant={editMode === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={handleCustomWeights}
              className="flex items-center gap-2"
            >
              <Scale className="h-4 w-4" />
              Pesos Personalizados
            </Button>
          </div>

          {/* Total Weight Control */}
          {editMode === 'distribute' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Peso Total a Distribuir</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Label htmlFor="totalWeight" className="min-w-fit">Peso Total (KG):</Label>
                  <Input
                    id="totalWeight"
                    type="number"
                    step="0.01"
                    value={totalWeight}
                    onChange={(e) => setTotalWeight(parseFloat(e.target.value) || 0)}
                    className="w-32"
                  />
                  <Button size="sm" onClick={handleDistributeEvenly}>
                    Distribuir
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shared Items List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Itens Compartilhando a Caixa ({group.totalSharedItems})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {group.sharedItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Item #{item.item_number}</p>
                        <p className="font-medium text-sm">{item.descricao_ingles}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {item.quantidade_por_pacote} unidades
                        </Badge>
                      </div>
                      
                      <div>
                        <Label htmlFor={`weight-${index}`} className="text-sm">
                          Peso por Pacote (KG)
                        </Label>
                        <Input
                          id={`weight-${index}`}
                          type="number"
                          step="0.01"
                          value={individualWeights[index] || 0}
                          onChange={(e) => handleIndividualWeightChange(index, parseFloat(e.target.value) || 0)}
                          disabled={editMode === 'distribute'}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Peso Total</p>
                        <p className="font-medium text-sm">
                          {((individualWeights[index] || 0) * (item.quantidade_por_pacote || 1)).toFixed(2)} KG
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Líquido: {((individualWeights[index] || 0) * 0.95).toFixed(2)} KG
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Summary */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Total dos Pesos Individuais</p>
                  <p className="text-xs text-muted-foreground">
                    {editMode === 'distribute' ? 'Distribuído automaticamente' : 'Soma dos pesos personalizados'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${isWeightBalanced ? 'text-green-600' : 'text-orange-600'}`}>
                    {totalIndividualWeight.toFixed(2)} KG
                  </p>
                  {!isWeightBalanced && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <AlertTriangle className="h-3 w-3" />
                      Diferença: {Math.abs(totalIndividualWeight - totalWeight).toFixed(2)} KG
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isWeightBalanced && editMode !== 'separate'}
          >
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
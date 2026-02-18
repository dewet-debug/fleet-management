import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadVehicles, uploadDrivers, uploadServices, uploadAssignments } from '../api/bulkUpload';

export const useUploadVehicles = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadVehicles,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
};

export const useUploadDrivers = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadDrivers,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  });
};

export const useUploadServices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadServices,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
};

export const useUploadAssignments = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadAssignments,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
};

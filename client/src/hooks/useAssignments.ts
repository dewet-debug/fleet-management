import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAssignments, createAssignment, endAssignment } from '../api/assignments';
import type { AssignmentsParams, CreateAssignmentData } from '../api/assignments';

export const useAssignments = (params?: AssignmentsParams) => {
  return useQuery({
    queryKey: ['assignments', params],
    queryFn: () => getAssignments(params),
  });
};

export const useCreateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssignmentData) => createAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Assignment created successfully');
    },
    onError: () => {
      toast.error('Failed to create assignment');
    },
  });
};

export const useEndAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => endAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Assignment ended successfully');
    },
    onError: () => {
      toast.error('Failed to end assignment');
    },
  });
};

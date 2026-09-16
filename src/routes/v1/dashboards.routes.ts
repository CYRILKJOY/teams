import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireManager } from '../../utils/auth.js';
import { TaskRepository } from '../../services/repositories/task.repository.js';
import { EmployeeRepository } from '../../services/repositories/employee.repository.js';
import { DailyReviewRepository } from '../../services/repositories/daily-review.repository.js';
import { format, toZonedTime } from 'date-fns-tz';
import { OrganizationRepository } from '../../services/repositories/organization.repository.js';

export default async function dashboardsRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get('/employee', async (request, reply) => {
    const { userContext } = request;

    if (!userContext.employeeId) {
      return reply
        .code(403)
        .send({ error: 'Forbidden', message: 'User is not mapped to an employee' });
    }

    try {
      // 1. Get tasks for the employee
      const tasks = await TaskRepository.getTasksForEmployee(userContext.employeeId);

      // 2. Get today's daily reviews
      const org = await OrganizationRepository.findById(userContext.orgId);
      const timezone = org?.timezone || 'UTC';
      const zonedNow = toZonedTime(new Date(), timezone);
      const todayStr = format(zonedNow, 'yyyy-MM-dd', { timeZone: timezone });

      const morningReview = await DailyReviewRepository.findByEmployeeAndDate(
        userContext.employeeId,
        todayStr,
        'MORNING'
      );
      const eveningReview = await DailyReviewRepository.findByEmployeeAndDate(
        userContext.employeeId,
        todayStr,
        'EVENING'
      );

      return reply.send({
        tasks,
        reviews: {
          morning: morningReview,
          evening: eveningReview
        }
      });
    } catch (error: unknown) {
      request.log.error({ error: (error as Error).message }, 'Failed to fetch employee dashboard');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/manager', { preValidation: [requireManager] }, async (request, reply) => {
    const { userContext } = request;

    try {
      // 1. Get all employees in the org
      const employees = await EmployeeRepository.findByOrgId(userContext.orgId);

      // 2. Get tasks for all employees
      // We could do this more optimally, but for now we'll fetch them individually or create a new repo method
      // Better: add a repo method to fetch all tasks for an org, or we map it out here
      // For phase 9 we will map them

      const employeeTasks = await Promise.all(
        employees.map(async (emp) => {
          const tasks = await TaskRepository.getTasksForEmployee(emp.id);
          return { employee: emp, tasks };
        })
      );

      // We should also fetch today's reviews for the team
      const org = await OrganizationRepository.findById(userContext.orgId);
      const timezone = org?.timezone || 'UTC';
      const zonedNow = toZonedTime(new Date(), timezone);
      const todayStr = format(zonedNow, 'yyyy-MM-dd', { timeZone: timezone });

      // Just for a snapshot, let's fetch morning/evening review states for each
      const teamData = await Promise.all(
        employees.map(async (emp) => {
          const morning = await DailyReviewRepository.findByEmployeeAndDate(
            emp.id,
            todayStr,
            'MORNING'
          );
          const evening = await DailyReviewRepository.findByEmployeeAndDate(
            emp.id,
            todayStr,
            'EVENING'
          );

          const empTasks = employeeTasks.find((et) => et.employee.id === emp.id)?.tasks || [];

          return {
            id: emp.id,
            user_id: emp.user_id,
            microsoft_id: emp.microsoft_id,
            clickup_id: emp.clickup_id,
            reviews: { morning, evening },
            tasks: empTasks
          };
        })
      );

      return reply.send({
        team: teamData,
        date: todayStr,
        timezone
      });
    } catch (error: unknown) {
      request.log.error({ error: (error as Error).message }, 'Failed to fetch manager dashboard');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

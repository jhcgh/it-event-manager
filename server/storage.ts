async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const startTime = Date.now();
      console.log('Storage updateUser started:', {
        userId: id,
        updates: { ...updateData, password: updateData.password ? '[REDACTED]' : undefined },
        timestamp: new Date().toISOString()
      });

      // First verify the user exists
      const existingUser = await this.getUser(id);
      if (!existingUser) {
        console.error('User not found:', id);
        throw new Error('User not found');
      }

      const validUpdateFields = {
        ...(updateData.username && { username: updateData.username }),
        ...(updateData.firstName && { firstName: updateData.firstName }),
        ...(updateData.lastName && { lastName: updateData.lastName }),
        ...(updateData.title && { title: updateData.title }),
        ...(updateData.mobile && { mobile: updateData.mobile }),
        ...(updateData.status && { status: updateData.status }),
        updatedAt: new Date()
      };

      console.log('Executing update query with fields:', {
        userId: id,
        updateFields: Object.keys(validUpdateFields),
        timestamp: new Date().toISOString()
      });

      // Perform the update with specific fields
      const [result] = await db
        .update(users)
        .set(validUpdateFields)
        .where(eq(users.id, id))
        .returning();

      const endTime = Date.now();
      console.log('Storage updateUser completed:', {
        userId: id,
        success: !!result,
        processingTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('Error in storage.updateUser:', {
        userId: id,
        error,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

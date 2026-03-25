/**
 * Base repository with common CRUD operations.
 * All repositories extend this class.
 */
export default class BaseRepository {
    constructor(model) {
        this.model = model;
    }

    async findById(id, options = {}) {
        const query = this.model.findById(id);
        if (options.select) query.select(options.select);
        if (options.populate) query.populate(options.populate);
        if (options.lean) query.lean();
        return query;
    }

    async findOne(filter, options = {}) {
        const query = this.model.findOne(filter);
        if (options.select) query.select(options.select);
        if (options.populate) query.populate(options.populate);
        if (options.lean) query.lean();
        return query;
    }

    async find(filter = {}, options = {}) {
        const query = this.model.find(filter);
        if (options.select) query.select(options.select);
        if (options.populate) query.populate(options.populate);
        if (options.sort) query.sort(options.sort);
        if (options.skip) query.skip(options.skip);
        if (options.limit) query.limit(options.limit);
        if (options.lean) query.lean();
        if (options.session) query.session(options.session);
        return query;
    }

    async create(data, options = {}) {
        if (options.session) {
            const [doc] = await this.model.create([data], { session: options.session });
            return doc;
        }
        return this.model.create(data);
    }

    async insertMany(data, options = {}) {
        return this.model.insertMany(data, options);
    }

    async updateById(id, data, options = {}) {
        return this.model.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
            ...options,
        });
    }

    async deleteById(id, options = {}) {
        const doc = await this.model.findById(id);
        if (!doc) return null;
        await doc.deleteOne(options.session ? { session: options.session } : {});
        return doc;
    }

    async deleteMany(filter, options = {}) {
        return this.model.deleteMany(filter, options.session ? { session: options.session } : {});
    }

    async count(filter = {}) {
        return this.model.countDocuments(filter);
    }

    async aggregate(pipeline) {
        return this.model.aggregate(pipeline);
    }

    async paginate(filter, { page = 1, limit = 20, sort, select, populate, lean = true }) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.find(filter, { sort, select, populate, skip, limit: parseInt(limit), lean }),
            this.count(filter),
        ]);
        return { data, total, page: parseInt(page), limit: parseInt(limit) };
    }
}

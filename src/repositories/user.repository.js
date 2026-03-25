import User from "../models/user.model.js";
import BaseRepository from "./base.repository.js";

class UserRepository extends BaseRepository {
    constructor() {
        super(User);
    }

    async findByEmail(email, options = {}) {
        return this.findOne({ email }, options);
    }

    async findByEmailWithPassword(email) {
        return this.model.findOne({ email }).select("+password");
    }

    async findByIdWithPassword(id) {
        return this.model.findById(id).select("+password");
    }

    async searchUsers({ page = 1, limit = 20, role, status, search }) {
        const filter = {};
        if (role) filter.role = role;
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }
        return this.paginate(filter, {
            page,
            limit,
            sort: { createdAt: -1 },
            select: "-password",
        });
    }
}

export default new UserRepository();
